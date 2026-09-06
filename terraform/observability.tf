# --- AWS Managed Prometheus: where the collector remote-writes metrics ---

resource "aws_prometheus_workspace" "main" {
  alias = "${var.cluster_name}-observability"
}

# --- AWS Managed Grafana: queries both AMP (metrics) and X-Ray (traces)
# as data sources — this is what actually makes "unified" concrete: one
# dashboard, two data sources, covering both Lambda and EKS. ---
#
# NOTE: user/SSO access to this workspace is not something Terraform can
# fully automate — AMG requires either IAM Identity Center or SAML setup
# assigning specific users/groups, which is an account-level, largely
# manual configuration step. This provisions the workspace and its data
# source permissions; granting yourself access to actually log in is a
# manual follow-up in the AMG console.
resource "aws_grafana_workspace" "main" {
  name                     = "${var.cluster_name}-observability"
  account_access_type      = "CURRENT_ACCOUNT"
  authentication_providers = ["AWS_SSO"]
  permission_type          = "SERVICE_MANAGED"
  data_sources              = ["PROMETHEUS", "XRAY"]
}

# --- IRSA: the OTel Collector (k8s/21-otel-collector-deployment.yaml) ---

data "aws_iam_policy_document" "otel_collector_assume_role" {
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
      values   = ["system:serviceaccount:studmgmt:otel-collector-service-account"]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "otel_collector" {
  name               = "${var.cluster_name}-otel-collector-irsa"
  assume_role_policy = data.aws_iam_policy_document.otel_collector_assume_role.json
}

resource "aws_iam_role_policy_attachment" "otel_collector_xray" {
  role       = aws_iam_role.otel_collector.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

data "aws_iam_policy_document" "otel_collector_amp_write" {
  statement {
    effect    = "Allow"
    actions   = ["aps:RemoteWrite"]
    resources = [aws_prometheus_workspace.main.arn]
  }
}

resource "aws_iam_role_policy" "otel_collector_amp_write" {
  name   = "${var.cluster_name}-otel-collector-amp-write"
  role   = aws_iam_role.otel_collector.id
  policy = data.aws_iam_policy_document.otel_collector_amp_write.json
}

# --- Lambda tracing: every Lambda gets the same AWS-managed X-Ray write
# policy attached to its existing execution role. Combined with the ADOT
# layer + active tracing config in each aws_lambda_function resource
# (see lambdas.tf and assignment-submissions.tf), this is what lets a
# trace that starts in a Lambda continue into X-Ray the same way EKS
# traces do via the collector. ---

resource "aws_iam_role_policy_attachment" "get_upload_url_lambda_xray" {
  role       = aws_iam_role.get_upload_url_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy_attachment" "process_import_lambda_xray" {
  role       = aws_iam_role.process_import_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy_attachment" "process_submission_lambda_xray" {
  role       = aws_iam_role.process_submission_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}
