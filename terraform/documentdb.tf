# Compatibility note carried over from testing this app directly: Mongoose
# connects via whatever's in MONGODB_URI with no code-level TLS config, so
# DocumentDB works without touching app code as long as the connection
# string includes tls=true&tlsCAFile=... (see k8s/02-backend-secret.example.yaml)
# and the image ships the CA bundle (see backend/Dockerfile). DocumentDB
# also only implements a subset of MongoDB's aggregation operators —
# nothing in this app's aggregation pipelines is exotic, but it's worth
# smoke-testing the mark-entry / report-card endpoints against a real
# DocumentDB cluster before trusting it fully.
resource "aws_security_group" "docdb" {
  name_prefix = "${var.cluster_name}-docdb-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "MongoDB wire protocol from EKS worker nodes"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.cluster_name}-docdb" }
}

resource "random_password" "docdb_master" {
  length  = 32
  special = false # DocumentDB's master password disallows several special characters
}

resource "aws_docdb_cluster" "main" {
  cluster_identifier        = "${var.cluster_name}-docdb"
  engine                    = "docdb"
  engine_version            = "5.0.0"
  master_username           = var.docdb_master_username
  master_password           = random_password.docdb_master.result
  db_subnet_group_name      = module.vpc.database_subnet_group_name
  vpc_security_group_ids    = [aws_security_group.docdb.id]
  storage_encrypted         = true
  backup_retention_period   = 7
  preferred_backup_window   = "03:00-05:00"
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.cluster_name}-docdb-final"
}

resource "aws_docdb_cluster_instance" "main" {
  count              = 2 # one primary, one replica for basic HA
  identifier         = "${var.cluster_name}-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.docdb_instance_class
}
