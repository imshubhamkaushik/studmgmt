# IRSA (IAM Roles for Service Accounts): each role trusts the cluster's
# OIDC provider and is scoped to one specific Kubernetes ServiceAccount via
# the "sub" condition below — a pod can only assume this role by running
# as that exact service account, nothing broader.

data "aws_iam_policy_document" "ebs_csi_assume_role" {
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
      values   = ["system:serviceaccount:kube-system:ebs-csi-controller-sa"]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ebs_csi_driver" {
  name               = "${var.cluster_name}-ebs-csi-driver"
  assume_role_policy = data.aws_iam_policy_document.ebs_csi_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ebs_csi_driver" {
  role       = aws_iam_role.ebs_csi_driver.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

# Backend app role — read-only access to exactly the four Secrets Manager
# entries it needs (see secrets.tf), nothing else in the account. This is
# the ARN that goes into k8s/02c-backend-serviceaccount.yaml's annotation.
data "aws_iam_policy_document" "backend_assume_role" {
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
      values   = ["system:serviceaccount:studmgmt:backend-service-account"]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "backend" {
  name               = "${var.cluster_name}-backend-irsa"
  assume_role_policy = data.aws_iam_policy_document.backend_assume_role.json
}

data "aws_iam_policy_document" "backend_secrets_access" {
  statement {
    effect  = "Allow"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      aws_secretsmanager_secret.jwt_secret.arn,
      aws_secretsmanager_secret.admin_password.arn,
      aws_secretsmanager_secret.docdb_connection_string.arn,
      aws_secretsmanager_secret.redis_connection_string.arn,
    ]
  }
}

resource "aws_iam_role_policy" "backend_secrets_access" {
  name   = "${var.cluster_name}-backend-secrets-access"
  role   = aws_iam_role.backend.id
  policy = data.aws_iam_policy_document.backend_secrets_access.json
}

# Read-only access for the /students/import-jobs/:jobId status endpoint —
# a separate named policy from backend_secrets_access above so each grant
# stays legible on its own rather than one policy accumulating unrelated
# permissions over time.
data "aws_iam_policy_document" "backend_import_job_status" {
  statement {
    effect    = "Allow"
    actions   = ["dynamodb:GetItem"]
    resources = [aws_dynamodb_table.import_jobs.arn]
  }
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.imports.arn}/reports/*"]
  }
}

resource "aws_iam_role_policy" "backend_import_job_status" {
  name   = "${var.cluster_name}-backend-import-job-status"
  role   = aws_iam_role.backend.id
  policy = data.aws_iam_policy_document.backend_import_job_status.json
}

# --- get-upload-url Lambda: write to the imports bucket, create job records ---

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "get_upload_url_lambda" {
  name               = "${var.cluster_name}-get-upload-url-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "get_upload_url_lambda_logs" {
  role       = aws_iam_role.get_upload_url_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "get_upload_url_lambda" {
  statement {
    effect    = "Allow"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.imports.arn}/uploads/*"]
  }
  statement {
    effect    = "Allow"
    actions   = ["dynamodb:PutItem"]
    resources = [aws_dynamodb_table.import_jobs.arn]
  }
}

resource "aws_iam_role_policy" "get_upload_url_lambda" {
  name   = "${var.cluster_name}-get-upload-url-lambda"
  role   = aws_iam_role.get_upload_url_lambda.id
  policy = data.aws_iam_policy_document.get_upload_url_lambda.json
}

# --- process-import Lambda: read the CSV, write an error report, queue rows ---

resource "aws_iam_role" "process_import_lambda" {
  name               = "${var.cluster_name}-process-import-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "process_import_lambda_logs" {
  role       = aws_iam_role.process_import_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "process_import_lambda" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.imports.arn}/uploads/*"]
  }
  statement {
    effect    = "Allow"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.imports.arn}/reports/*"]
  }
  statement {
    effect    = "Allow"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.import_queue.arn]
  }
  statement {
    effect    = "Allow"
    actions   = ["dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.import_jobs.arn]
  }
}

resource "aws_iam_role_policy" "process_import_lambda" {
  name   = "${var.cluster_name}-process-import-lambda"
  role   = aws_iam_role.process_import_lambda.id
  policy = data.aws_iam_policy_document.process_import_lambda.json
}

# --- import-worker (EKS): consumes the queue, updates job status, publishes SNS ---
# A separate role from `backend` above rather than reusing it — the API
# server has no business touching SQS/DynamoDB/SNS, and giving it those
# permissions "since the role already exists" would be the kind of
# unused-permission creep that shows up in a security review later.

data "aws_iam_policy_document" "import_worker_assume_role" {
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
      values   = ["system:serviceaccount:studmgmt:import-worker-service-account"]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "import_worker" {
  name               = "${var.cluster_name}-import-worker-irsa"
  assume_role_policy = data.aws_iam_policy_document.import_worker_assume_role.json
}

data "aws_iam_policy_document" "import_worker" {
  # Same Secrets Manager entries as the `backend` role — this workload
  # also needs MONGODB_URI to write students. JWT_SECRET/ADMIN_PASSWORD
  # aren't used by the worker but come along in the same synced Secret
  # for simplicity (see k8s/10-import-worker-deployment.yaml); harmless
  # to have read access to values it doesn't read.
  statement {
    effect  = "Allow"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      aws_secretsmanager_secret.jwt_secret.arn,
      aws_secretsmanager_secret.admin_password.arn,
      aws_secretsmanager_secret.docdb_connection_string.arn,
      aws_secretsmanager_secret.redis_connection_string.arn,
    ]
  }
  statement {
    effect    = "Allow"
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
    resources = [aws_sqs_queue.import_queue.arn]
  }
  statement {
    effect    = "Allow"
    actions   = ["dynamodb:UpdateItem", "dynamodb:GetItem"]
    resources = [aws_dynamodb_table.import_jobs.arn]
  }
  statement {
    effect    = "Allow"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.import_notifications.arn]
  }
}

resource "aws_iam_role_policy" "import_worker" {
  name   = "${var.cluster_name}-import-worker"
  role   = aws_iam_role.import_worker.id
  policy = data.aws_iam_policy_document.import_worker.json
}
