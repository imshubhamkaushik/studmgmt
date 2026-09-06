variable "import_notification_email" {
  description = "Email address to notify when a CSV import job finishes. Leave empty to skip the subscription (you'd then need to subscribe manually)."
  type        = string
  default     = ""
}

# --- S3: raw CSV uploads and error reports ---

resource "aws_s3_bucket" "imports" {
  bucket = "${var.cluster_name}-imports-${data.aws_caller_identity.current.account_id}"
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket_lifecycle_configuration" "imports" {
  bucket = aws_s3_bucket.imports.id
  rule {
    id     = "expire-after-30-days"
    status = "Enabled"
    expiration { days = 30 }
  }
}

resource "aws_s3_bucket_public_access_block" "imports" {
  bucket                  = aws_s3_bucket.imports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Required for the EventBridge rule below to receive this bucket's events
# at all — S3 doesn't forward to the default event bus otherwise.
resource "aws_s3_bucket_notification" "imports_eventbridge" {
  bucket      = aws_s3_bucket.imports.id
  eventbridge = true
}

# --- SQS: validated rows queued for the EKS-hosted enrollment service ---

resource "aws_sqs_queue" "import_dlq" {
  name                      = "${var.cluster_name}-import-dlq"
  message_retention_seconds = 1209600 # 14 days — long enough to notice and investigate
}

resource "aws_sqs_queue" "import_queue" {
  name                       = "${var.cluster_name}-import-queue"
  visibility_timeout_seconds = 60 # matches the worker's ReceiveMessage VisibilityTimeout
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.import_dlq.arn
    maxReceiveCount      = 5
  })
}

# --- DynamoDB: import job status ---

resource "aws_dynamodb_table" "import_jobs" {
  name         = "${var.cluster_name}-import-jobs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "jobId"

  attribute {
    name = "jobId"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled         = true
  }
}

# --- SNS: import completion notifications ---

resource "aws_sns_topic" "import_notifications" {
  name = "${var.cluster_name}-import-notifications"
}

resource "aws_sns_topic_subscription" "import_notifications_email" {
  count     = var.import_notification_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.import_notifications.arn
  protocol  = "email"
  endpoint  = var.import_notification_email
}
