# --- S3: submitted assignment files ---

resource "aws_s3_bucket" "submissions" {
  bucket = "${var.cluster_name}-submissions-${data.aws_caller_identity.current.account_id}"
}

# Deliberately no lifecycle expiration rule here, unlike the imports
# bucket's 30-day rule — these are graded student submissions, not
# transient upload artifacts, and auto-deleting them would be a real data
# loss bug, not a cost optimization.
resource "aws_s3_bucket_public_access_block" "submissions" {
  bucket                  = aws_s3_bucket.submissions.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "submissions" {
  bucket = aws_s3_bucket.submissions.id
  cors_rule {
    allowed_methods = ["POST"]
    allowed_origins = ["https://studmgmt.example.com"] # update once the real domain is known
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_notification" "submissions_eventbridge" {
  bucket      = aws_s3_bucket.submissions.id
  eventbridge = true
}

# --- SQS: validation results queued for the EKS-hosted worker ---

resource "aws_sqs_queue" "submission_dlq" {
  name                      = "${var.cluster_name}-submission-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "submission_queue" {
  name                       = "${var.cluster_name}-submission-queue"
  visibility_timeout_seconds = 30 # matches submission-consumer.js's ReceiveMessage VisibilityTimeout
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.submission_dlq.arn
    maxReceiveCount      = 5
  })
}

# --- EventBridge: route S3 object-created events (submissions/ prefix
# only, same reasoning as the imports pipeline's own prefix scoping) to
# process-submission ---

resource "aws_cloudwatch_event_rule" "submission_uploaded" {
  name = "${var.cluster_name}-submission-uploaded"
  event_pattern = jsonencode({
    source      = ["aws.s3"]
    detail-type = ["Object Created"]
    detail = {
      bucket = { name = [aws_s3_bucket.submissions.bucket] }
      object = { key = [{ prefix = "submissions/" }] }
    }
  })
}

# Catches events EventBridge could not successfully deliver to a target
# Lambda after retrying (the Lambda itself erroring, throttling, or
# timing out) — found while writing the resilience test plan and
# confirmed as a real gap, not a hypothetical: without this,
# process-import's or process-submission's EventBridge targets had no
# dead_letter_config at all, meaning a failed invocation was silently
# dropped with zero record anywhere. This is a different failure mode
# from each pipeline's own SQS DLQ, which only catches failures *after*
# the Lambda successfully ran.
resource "aws_sqs_queue" "eventbridge_target_dlq" {
  name                      = "${var.cluster_name}-eventbridge-target-dlq"
  message_retention_seconds = 1209600
}

data "aws_iam_policy_document" "eventbridge_target_dlq_policy" {
  statement {
    effect    = "Allow"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.eventbridge_target_dlq.arn]
    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      # Shared by both EventBridge rules that target a Lambda — csv_uploaded
      # lives in lambdas.tf, submission_uploaded right above in this file.
      values = [aws_cloudwatch_event_rule.csv_uploaded.arn, aws_cloudwatch_event_rule.submission_uploaded.arn]
    }
  }
}

resource "aws_sqs_queue_policy" "eventbridge_target_dlq" {
  queue_url = aws_sqs_queue.eventbridge_target_dlq.id
  policy    = data.aws_iam_policy_document.eventbridge_target_dlq_policy.json
}

resource "aws_cloudwatch_event_target" "process_submission" {
  rule = aws_cloudwatch_event_rule.submission_uploaded.name
  arn  = aws_lambda_function.process_submission.arn

  dead_letter_config {
    arn = aws_sqs_queue.eventbridge_target_dlq.arn
  }

  retry_policy {
    maximum_retry_attempts       = 3
    maximum_event_age_in_seconds = 3600
  }
}

resource "aws_lambda_permission" "allow_eventbridge_process_submission" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.process_submission.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.submission_uploaded.arn
}

# --- Lambda: process-submission ---
# No VPC attachment, no DB access — it only validates file type against
# the S3 object's own metadata and queues the result. See the comment in
# lambdas/process-submission/index.mjs for why size isn't re-checked here
# (S3's presigned POST condition already enforced it before the object
# could even land in the bucket).

data "archive_file" "process_submission" {
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/process-submission/dist"
  output_path = "${path.module}/../lambdas/process-submission/dist.zip"
}

data "aws_iam_policy_document" "process_submission_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "process_submission_lambda" {
  name               = "${var.cluster_name}-process-submission-lambda"
  assume_role_policy = data.aws_iam_policy_document.process_submission_assume_role.json
}

data "aws_iam_policy_document" "process_submission_lambda_policy" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:HeadObject"]
    resources = ["${aws_s3_bucket.submissions.arn}/submissions/*"]
  }
  statement {
    effect    = "Allow"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.submission_queue.arn]
  }
  statement {
    effect    = "Allow"
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_role_policy" "process_submission_lambda" {
  name   = "${var.cluster_name}-process-submission-lambda"
  role   = aws_iam_role.process_submission_lambda.id
  policy = data.aws_iam_policy_document.process_submission_lambda_policy.json
}

resource "aws_lambda_function" "process_submission" {
  function_name    = "${var.cluster_name}-process-submission"
  role             = aws_iam_role.process_submission_lambda.arn
  handler          = "lambdas/process-submission/index.handler"
  runtime          = "nodejs22.x"
  filename         = data.archive_file.process_submission.output_path
  source_code_hash = data.archive_file.process_submission.output_base64sha256
  timeout          = 15
  memory_size      = 256
  layers           = [var.adot_lambda_layer_arn]

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      SUBMISSION_QUEUE_URL     = aws_sqs_queue.submission_queue.url
      AWS_LAMBDA_EXEC_WRAPPER = "/opt/otel-handler"
    }
  }
}

# --- IRSA: submission-consumer worker (backend/src/workers/submission-consumer.js) ---
# A separate role from both the import-worker's and the API server's —
# this process only ever needs to read/delete from one queue and never
# touches S3, DynamoDB, or Secrets Manager directly (Mongo/JWT config
# comes from the same backend-secret Secret the API server already syncs).

data "aws_iam_policy_document" "submission_worker_assume_role" {
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
      values   = ["system:serviceaccount:studmgmt:submission-worker-service-account"]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "submission_worker" {
  name               = "${var.cluster_name}-submission-worker-irsa"
  assume_role_policy = data.aws_iam_policy_document.submission_worker_assume_role.json
}

data "aws_iam_policy_document" "submission_worker_policy" {
  statement {
    effect    = "Allow"
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
    resources = [aws_sqs_queue.submission_queue.arn]
  }
  statement {
    effect  = "Allow"
    actions = ["secretsmanager:GetSecretValue"]
    # In practice this worker reads MONGODB_URI as a plain env var from
    # the same backend-secret K8s Secret the API server uses (populated
    # by External Secrets Operator under backend-service-account's
    # identity, not this role) — it never calls Secrets Manager directly
    # itself. Granted here anyway, scoped to just the one entry this
    # workload actually needs, rather than leaving the role with no
    # Secrets Manager access and no clear place to add it if that ever
    # changes.
    resources = [aws_secretsmanager_secret.docdb_connection_string.arn]
  }
}

resource "aws_iam_role_policy" "submission_worker" {
  name   = "${var.cluster_name}-submission-worker"
  role   = aws_iam_role.submission_worker.id
  policy = data.aws_iam_policy_document.submission_worker_policy.json
}

# --- Backend API server: needs to read/write the submissions bucket
# directly (create presigned POSTs, presign downloads) ---

data "aws_iam_policy_document" "backend_submissions_access" {
  statement {
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.submissions.arn}/submissions/*"]
  }
}

resource "aws_iam_role_policy" "backend_submissions_access" {
  name   = "${var.cluster_name}-backend-submissions-access"
  role   = aws_iam_role.backend.id
  policy = data.aws_iam_policy_document.backend_submissions_access.json
}
