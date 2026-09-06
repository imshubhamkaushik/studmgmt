# As with the VPC, using the community module for the control plane and
# node group — the module handles the IAM roles, security groups, and
# aws-auth wiring that would otherwise be a lot of easy-to-get-subtly-wrong
# boilerplate. Module interfaces do shift between major versions, so
# confirm ~> 20.31 is still current against the registry before applying;
# I can't reach registry.terraform.io from this sandbox to verify it live.
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.31"

  cluster_name    = var.cluster_name
  cluster_version = "1.30"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Public endpoint is simplest for a portfolio project reachable from
  # your laptop; for anything beyond that, restrict this to a VPN/bastion
  # CIDR and set this false.
  cluster_endpoint_public_access = true

  enable_cluster_creator_admin_permissions = true

  eks_managed_node_groups = {
    default = {
      instance_types = var.eks_node_instance_types
      min_size       = var.eks_node_min_size
      max_size       = var.eks_node_max_size
      desired_size   = var.eks_node_desired_size
    }
  }

  cluster_addons = {
    coredns    = { most_recent = true }
    kube-proxy = { most_recent = true }
    vpc-cni    = { most_recent = true }
    # The EBS CSI driver addon needs its own IRSA role (it calls the EC2
    # API to attach/detach volumes) — see the aws_iam_role in iam.tf and
    # confirm the exact addon argument name (service_account_role_arn as
    # of module v20) against current module docs before applying.
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = aws_iam_role.ebs_csi_driver.arn
    }
  }
}
