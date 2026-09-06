# Both Lambdas are packaged by lambdas/build.sh, which stages
# lambdas/<name>/dist/ preserving the repo's real directory nesting
# (shared/ as a sibling of lambdas/<name>/) so index.mjs's relative
# import of ../../shared/*.mjs resolves identically locally and once
# deployed — see the comment at the top of build.sh for why. Run that
# script before `terraform apply`; these data sources just zip whatever
# is already staged in dist/, they don't build anything themselves.

data "archive_file" "get_upload_url" {
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/get-upload-url/dist"
  output_path = "${path.module}/../lambdas/get-upload-url/dist.zip"
}

data "archive_file" "process_import" {
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/process-import/dist"
  output_path = "${path.module}/../lambdas/process-import/dist.zip"
}

resource "aws_lambda_function" "get_upload_url" {
  function_name    = "${var.cluster_name}-get-upload-url"
  role             = aws_iam_role.get_upload_url_lambda.arn
  filename         = data.archive_file.get_upload_url.output_path
  source_code_hash = data.archive_file.get_upload_url.output_base64sha256
  # A path within the zip, not a bare "index.handler" — build.sh nests
  # index.mjs under lambdas/get-upload-url/ inside the package on purpose.
  handler = "lambdas/get-upload-url/index.handler"
  runtime = "nodejs22.x"
  timeout = 10
  layers  = [var.adot_lambda_layer_arn]

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      IMPORTS_BUCKET = aws_s3_bucket.imports.bucket
      JOBS_TABLE     = aws_dynamodb_table.import_jobs.name
      # Required by the ADOT layer to actually wrap the handler and
      # start/export a span for each invocation.
      AWS_LAMBDA_EXEC_WRAPPER = "/opt/otel-handler"
      # Passed as a plain Lambda environment variable rather than fetched
      # from Secrets Manager at invocation time — encrypted at rest by
      # AWS-managed KMS like any Lambda env var, but visible in plaintext
      # to anyone with lambda:GetFunctionConfiguration on this function,
      # unlike the backend's JWT_SECRET which never leaves Secrets
      # Manager / the synced K8s Secret. Fetching it at runtime (with
      # in-memory caching so it's not called on every invocation) would
      # close that gap; not done here to keep this phase's scope to what
      # was actually asked for.
      JWT_SECRET = random_password.jwt_secret.result
    }
  }
}

# Auth is intentionally "NONE" here: the function validates the caller's
# JWT itself (see shared/jwt.mjs) rather than relying on IAM auth, since
# the caller is an end user's browser with a JWT, not another AWS
# principal. A WAF in front of this URL would be a reasonable next
# hardening step if abuse becomes a concern; not added here to keep this
# phase's scope to what was actually asked for.
resource "aws_lambda_function_url" "get_upload_url" {
  function_name      = aws_lambda_function.get_upload_url.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = ["https://studmgmt.example.com"] # match CORS_ORIGINS in k8s/01-backend-configmap.yaml
    allow_methods = ["POST"]
    allow_headers = ["authorization", "content-type"]
  }
}

resource "aws_lambda_function" "process_import" {
  function_name    = "${var.cluster_name}-process-import"
  role             = aws_iam_role.process_import_lambda.arn
  filename         = data.archive_file.process_import.output_path
  source_code_hash = data.archive_file.process_import.output_base64sha256
  handler          = "lambdas/process-import/index.handler"
  runtime          = "nodejs22.x"
  timeout          = 60 # parsing + validating up to 500 rows, plus batched SQS sends
  layers           = [var.adot_lambda_layer_arn]

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      JOBS_TABLE              = aws_dynamodb_table.import_jobs.name
      IMPORT_QUEUE_URL         = aws_sqs_queue.import_queue.url
      AWS_LAMBDA_EXEC_WRAPPER = "/opt/otel-handler"
    }
  }
}

resource "aws_cloudwatch_event_rule" "csv_uploaded" {
  name = "${var.cluster_name}-csv-uploaded"
  event_pattern = jsonencode({
    source      = ["aws.s3"]
    detail-type = ["Object Created"]
    detail = {
      bucket = { name = [aws_s3_bucket.imports.bucket] }
      object = { key = [{ prefix = "uploads/" }] }
    }
  })
}

resource "aws_cloudwatch_event_target" "process_import" {
  rule = aws_cloudwatch_event_rule.csv_uploaded.name
  arn  = aws_lambda_function.process_import.arn

  # See the comment on aws_sqs_queue.eventbridge_target_dlq in
  # assignment-submissions.tf — this is the same real gap, fixed the
  # same way, for the CSV import pipeline's Lambda target.
  dead_letter_config {
    arn = aws_sqs_queue.eventbridge_target_dlq.arn
  }

  retry_policy {
    maximum_retry_attempts       = 3
    maximum_event_age_in_seconds = 3600
  }
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.process_import.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.csv_uploaded.arn
}
