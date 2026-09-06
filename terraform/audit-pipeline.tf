# --- S3: long-term audit archive ---
# Separate from both the imports and submissions buckets — this one's
# purpose (cheap, durable, rarely-read compliance retention) is different
# enough to warrant its own lifecycle policy rather than overloading an
# existing bucket's rules.

resource "aws_s3_bucket" "audit_archive" {
  bucket = "${var.cluster_name}-audit-archive-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "audit_archive" {
  bucket                  = aws_s3_bucket.audit_archive.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "audit_archive" {
  bucket = aws_s3_bucket.audit_archive.id
  rule {
    id     = "transition-to-glacier"
    status = "Enabled"
    # Stays in S3 Standard for 90 days (still cheaply queryable via
    # Athena if something needs recent history), then Glacier for
    # long-term retention at a fraction of the cost. No expiration rule —
    # unlike the imports bucket's 30-day cleanup, compliance archives are
    # not something to auto-delete.
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# --- SQS: audit domain events queued for the archive worker ---

resource "aws_sqs_queue" "audit_archive_dlq" {
  name                      = "${var.cluster_name}-audit-archive-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "audit_archive_queue" {
  name                       = "${var.cluster_name}-audit-archive-queue"
  visibility_timeout_seconds = 60 # matches audit-archive-worker.js's ReceiveMessage VisibilityTimeout
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.audit_archive_dlq.arn
    maxReceiveCount      = 5
  })
}

# --- EventBridge: route studmgmt.audit events (published from the
# backend's writeAudit(), on the account's default bus — no custom bus
# needed for a single consumer) straight to SQS. No Lambda in this
# pipeline: unlike the CSV import and submission pipelines, there's no
# S3 upload or file validation step to react to — audit.service.js has
# already fully resolved and validated the entry before publishing. ---

resource "aws_cloudwatch_event_rule" "audit_entry_created" {
  name = "${var.cluster_name}-audit-entry-created"
  event_pattern = jsonencode({
    source = ["studmgmt.audit"]
  })
}

resource "aws_cloudwatch_event_target" "audit_archive_queue" {
  rule = aws_cloudwatch_event_rule.audit_entry_created.name
  arn  = aws_sqs_queue.audit_archive_queue.arn
}

# EventBridge needs explicit permission to send to SQS — unlike invoking
# a Lambda (aws_lambda_permission), this is a queue policy on the SQS
# side.
data "aws_iam_policy_document" "audit_archive_queue_policy" {
  statement {
    effect    = "Allow"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.audit_archive_queue.arn]
    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_cloudwatch_event_rule.audit_entry_created.arn]
    }
  }
}

resource "aws_sqs_queue_policy" "audit_archive_queue" {
  queue_url = aws_sqs_queue.audit_archive_queue.id
  policy    = data.aws_iam_policy_document.audit_archive_queue_policy.json
}

# --- Backend API server: needs to publish to the default event bus ---

data "aws_iam_policy_document" "backend_audit_publish" {
  statement {
    effect    = "Allow"
    actions   = ["events:PutEvents"]
    resources = ["arn:aws:events:${var.aws_region}:${data.aws_caller_identity.current.account_id}:event-bus/default"]
  }
}

resource "aws_iam_role_policy" "backend_audit_publish" {
  name   = "${var.cluster_name}-backend-audit-publish"
  role   = aws_iam_role.backend.id
  policy = data.aws_iam_policy_document.backend_audit_publish.json
}

# --- IRSA: audit-archive-worker (backend/src/workers/audit-archive-worker.js) ---
# No Secrets Manager access at all, unlike every other worker in this
# repo — this is the one workload that never touches MongoDB. It only
# ever reads from one queue and writes to one bucket.

data "aws_iam_policy_document" "audit_archive_worker_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"
    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider, "https://", "")}:sub"
      values   = ["system:serviceaccount:studmgmt:audit-archive-worker-service-account"]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "audit_archive_worker" {
  name               = "${var.cluster_name}-audit-archive-worker-irsa"
  assume_role_policy = data.aws_iam_policy_document.audit_archive_worker_assume_role.json
}

data "aws_iam_policy_document" "audit_archive_worker_policy" {
  statement {
    effect    = "Allow"
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
    resources = [aws_sqs_queue.audit_archive_queue.arn]
  }
  statement {
    effect    = "Allow"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.audit_archive.arn}/audit-archive/*"]
  }
}

resource "aws_iam_role_policy" "audit_archive_worker" {
  name   = "${var.cluster_name}-audit-archive-worker"
  role   = aws_iam_role.audit_archive_worker.id
  policy = data.aws_iam_policy_document.audit_archive_worker_policy.json
}
