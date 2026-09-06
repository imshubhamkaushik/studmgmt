terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Uncomment once the state bucket + lock table exist (a one-time
  # bootstrap step done by hand or a separate tiny config — this file
  # can't create the backend it then uses).
  # backend "s3" {
  #   bucket         = "studmgmt-terraform-state"
  #   key            = "studmgmt/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "studmgmt-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "studmgmt"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
