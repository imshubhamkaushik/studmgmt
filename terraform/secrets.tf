# Key names here must match k8s/02b-backend-externalsecret.yaml's
# remoteRef.key values exactly — that's the only place the two are wired
# together, so a rename on either side silently breaks the sync.

resource "random_password" "jwt_secret" {
  length  = 48
  special = true
}

resource "random_password" "admin_password" {
  length  = 20
  special = true
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "studmgmt/jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

resource "aws_secretsmanager_secret" "admin_password" {
  name = "studmgmt/admin-bootstrap-password"
}

resource "aws_secretsmanager_secret_version" "admin_password" {
  secret_id     = aws_secretsmanager_secret.admin_password.id
  secret_string = random_password.admin_password.result
}

resource "aws_secretsmanager_secret" "docdb_connection_string" {
  name = "studmgmt/documentdb-connection-string"
}

resource "aws_secretsmanager_secret_version" "docdb_connection_string" {
  secret_id = aws_secretsmanager_secret.docdb_connection_string.id
  secret_string = join("", [
    "mongodb://", var.docdb_master_username, ":", random_password.docdb_master.result,
    "@", aws_docdb_cluster.main.endpoint, ":27017/studDB",
    "?tls=true&tlsCAFile=/app/certs/global-bundle.pem",
    "&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false",
  ])
}

resource "aws_secretsmanager_secret" "redis_connection_string" {
  name = "studmgmt/redis-connection-string"
}

resource "aws_secretsmanager_secret_version" "redis_connection_string" {
  secret_id     = aws_secretsmanager_secret.redis_connection_string.id
  secret_string = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379/0"
}
