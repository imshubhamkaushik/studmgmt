# AWS FIS (Fault Injection Simulator) experiment templates — these
# define *what* fault to inject and *where*; they don't run on their own,
# each requires manually starting the experiment (console or
# `aws fis start-experiment`) and watching the dashboard while it runs.
#
# HONEST CAVEAT: FIS's EKS and Lambda action IDs/parameters below reflect
# my best understanding, but this sandbox can't reach FIS's current API
# reference to confirm the exact action names and parameter schemas
# haven't changed. Run `aws fis list-actions` against your own account
# and cross-check before applying — treat this as a strong first draft,
# the same caveat as the ADOT layer ARN in variables.tf.

data "aws_iam_policy_document" "fis_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      type        = "Service"
      identifiers = ["fis.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "fis" {
  name               = "${var.cluster_name}-fis-experiments"
  assume_role_policy = data.aws_iam_policy_document.fis_assume_role.json
}

resource "aws_iam_role_policy_attachment" "fis_eks" {
  role       = aws_iam_role.fis.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSFISServiceRolePolicyForEKS"
}

data "aws_iam_policy_document" "fis_lambda" {
  statement {
    effect    = "Allow"
    actions   = ["lambda:InvokeFunction", "lambda:GetFunction"]
    resources = [
      aws_lambda_function.get_upload_url.arn,
      aws_lambda_function.process_import.arn,
      aws_lambda_function.process_submission.arn,
    ]
  }
}

resource "aws_iam_role_policy" "fis_lambda" {
  name   = "${var.cluster_name}-fis-lambda"
  role   = aws_iam_role.fis.id
  policy = data.aws_iam_policy_document.fis_lambda.json
}

# --- Experiment 1: kill an import-worker pod mid-processing ---
# Hypothesis: with 2 replicas and no shared state between them, killing
# one pod causes zero message loss — the killed pod's in-flight message
# becomes visible again after the queue's visibility timeout and the
# surviving replica (or the restarted one) picks it up. See
# RESILIENCE_TESTING.md for how to actually observe this.
resource "aws_fis_experiment_template" "kill_import_worker_pod" {
  description = "Terminate one import-worker pod while a CSV import is in flight"
  role_arn    = aws_iam_role.fis.arn

  action {
    name      = "kill-pod"
    action_id = "aws:eks:pod-delete"
    target {
      key   = "Pods"
      value = "import-worker-pods"
    }
    parameter {
      key   = "clusterIdentifier"
      value = module.eks.cluster_name
    }
    parameter {
      key   = "namespace"
      value = "studmgmt"
    }
  }

  target {
    resource_type = "aws:eks:pod"
    selection_mode = "COUNT(1)"
    parameters = {
      clusterIdentifier = module.eks.cluster_name
      namespace          = "studmgmt"
      selectorType       = "labelSelector"
      selectorValue      = "app=import-worker"
    }
  }

  stop_condition {
    source = "none"
  }

  tags = { Name = "${var.cluster_name}-kill-import-worker-pod" }
}

# --- Experiment 2: force process-import to error on every invocation ---
# Hypothesis: EventBridge doesn't retry a failed Lambda target
# indefinitely — after its configured retry attempts are exhausted, the
# S3-object-created event that would have triggered this is effectively
# dropped, since there's no DLQ configured on the EventBridge target
# itself (only on the SQS queue *after* the Lambda). This is a real gap
# this experiment is specifically designed to surface — see
# RESILIENCE_TESTING.md's "what this might reveal" note.
resource "aws_fis_experiment_template" "process_import_errors" {
  description = "Force every process-import invocation to fail for 5 minutes"
  role_arn    = aws_iam_role.fis.arn

  action {
    name      = "inject-error"
    action_id = "aws:lambda:invocation-error"
    target {
      key   = "Functions"
      value = "process-import-function"
    }
    parameter {
      key   = "duration"
      value = "PT5M"
    }
    parameter {
      key   = "errorCode"
      value = "InjectedFISError"
    }
  }

  target {
    resource_type  = "aws:lambda:function"
    selection_mode = "ALL"
    resource_arns  = [aws_lambda_function.process_import.arn]
  }

  stop_condition {
    source = "none"
  }

  tags = { Name = "${var.cluster_name}-process-import-errors" }
}
