output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "configure_kubectl" {
  description = "Run this to point kubectl at the new cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "ecr_backend_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  value = aws_ecr_repository.frontend.repository_url
}

output "docdb_cluster_endpoint" {
  value = aws_docdb_cluster.main.endpoint
}

output "redis_primary_endpoint" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}

# The value that goes into k8s/02c-backend-serviceaccount.yaml's
# eks.amazonaws.com/role-arn annotation.
output "backend_irsa_role_arn" {
  value = aws_iam_role.backend.arn
}

output "submissions_bucket_name" {
  value = aws_s3_bucket.submissions.bucket
}

output "submission_queue_url" {
  value = aws_sqs_queue.submission_queue.url
}

output "submission_worker_irsa_role_arn" {
  value = aws_iam_role.submission_worker.arn
}

output "audit_archive_bucket_name" {
  value = aws_s3_bucket.audit_archive.bucket
}

output "audit_archive_queue_url" {
  value = aws_sqs_queue.audit_archive_queue.url
}

output "audit_archive_worker_irsa_role_arn" {
  value = aws_iam_role.audit_archive_worker.arn
}

output "eventbridge_target_dlq_url" {
  description = "Should stay empty — anything here means EventBridge failed to invoke process-import or process-submission after retrying and the triggering S3 event was not processed at all"
  value       = aws_sqs_queue.eventbridge_target_dlq.url
}

output "amp_workspace_id" {
  value = aws_prometheus_workspace.main.id
}

output "amp_remote_write_endpoint" {
  description = "Goes into k8s/21-otel-collector-deployment.yaml's AMP_REMOTE_WRITE_ENDPOINT env var"
  value       = "${aws_prometheus_workspace.main.prometheus_endpoint}api/v1/remote_write"
}

output "amg_workspace_endpoint" {
  description = "Grafana URL — still requires manual AWS SSO user/group assignment before anyone can log in, see the comment in terraform/observability.tf"
  value       = aws_grafana_workspace.main.endpoint
}

output "otel_collector_irsa_role_arn" {
  value = aws_iam_role.otel_collector.arn
}

output "get_upload_url_function_url" {
  description = "Frontend calls this directly to request a presigned CSV upload URL"
  value       = aws_lambda_function_url.get_upload_url.function_url
}

output "import_queue_url" {
  value = aws_sqs_queue.import_queue.url
}

output "import_jobs_table_name" {
  value = aws_dynamodb_table.import_jobs.name
}

output "import_notifications_topic_arn" {
  value = aws_sns_topic.import_notifications.arn
}

# The value that goes into k8s/10-import-worker-deployment.yaml's
# ServiceAccount eks.amazonaws.com/role-arn annotation.
output "import_worker_irsa_role_arn" {
  value = aws_iam_role.import_worker.arn
}
