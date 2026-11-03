terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # State lives in an R2 bucket, which speaks the S3 API. The bucket and its access keys are
  # the one thing created by hand (see README). The endpoint contains the account ID, so CI
  # passes it in at init time with -backend-config.
  backend "s3" {
    bucket = "liftboard-tfstate"
    key    = "liftboard/terraform.tfstate"
    region = "auto"

    # R2 isn't AWS: skip the AWS-only checks and use path-style URLs.
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}

# Reads CLOUDFLARE_API_TOKEN from the environment; the token is never written to a file.
provider "cloudflare" {}
