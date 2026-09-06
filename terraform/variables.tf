variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name, used in tags and resource names"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "Name for the EKS cluster and related resources"
  type        = string
  default     = "studmgmt"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "eks_node_instance_types" {
  description = "Instance types for the EKS managed node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "eks_node_desired_size" {
  type    = number
  default = 2
}

variable "eks_node_min_size" {
  type    = number
  default = 1
}

variable "eks_node_max_size" {
  type    = number
  default = 4
}

variable "docdb_instance_class" {
  description = "Instance class for DocumentDB instances"
  type        = string
  default     = "db.t3.medium"
}

variable "docdb_master_username" {
  type    = string
  default = "studmgmt_admin"
}

variable "elasticache_node_type" {
  type    = string
  default = "cache.t3.micro"
}

# AWS publishes a new ADOT layer version fairly often, and the ARN is
# region- and architecture-specific. This default was accurate as of
# this repo being written, but registry.terraform.io / the AWS docs
# aren't reachable from the sandbox this was built in to confirm it's
# still current — check
# https://aws-otel.github.io/docs/getting-started/lambda/lambda-js
# for the current ARN for your region before applying.
variable "adot_lambda_layer_arn" {
  description = "ARN of the AWS Distro for OpenTelemetry Lambda layer (Node.js, x86_64) for var.aws_region"
  type        = string
  default     = "arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-19-0:4"
}
