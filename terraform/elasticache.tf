# transit_encryption_enabled is deliberately false: the backend's rate
# limiter is a hand-rolled Redis client speaking the RESP protocol over a
# plain node:net socket (see backend/src/middleware/rate-limit.middleware.js)
# — it has no TLS support, so a TLS-only endpoint would simply fail to
# connect. Traffic never leaves the VPC's private subnets, so this is a
# deliberate, documented trade-off for phase 1 rather than an oversight.
# Adding TLS support to that client (or swapping it for ioredis) would be
# the real fix if this matters later. at_rest_encryption_enabled is
# unrelated to the client and safe to leave on.
resource "aws_security_group" "redis" {
  name_prefix = "${var.cluster_name}-redis-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "Redis from EKS worker nodes"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.cluster_name}-redis" }
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.cluster_name}-redis"
  subnet_ids = module.vpc.database_subnets
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id      = "${var.cluster_name}-redis"
  description                = "Rate limiting cache for the studmgmt backend"
  engine                     = "redis"
  engine_version              = "7.1"
  node_type                  = var.elasticache_node_type
  num_cache_clusters          = 2
  automatic_failover_enabled = true
  subnet_group_name           = aws_elasticache_subnet_group.redis.name
  security_group_ids          = [aws_security_group.redis.id]
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = false
}
