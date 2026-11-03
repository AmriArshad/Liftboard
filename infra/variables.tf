variable "account_id" {
  description = "Cloudflare account ID. Set via TF_VAR_account_id from the CLOUDFLARE_ACCOUNT_ID secret."
  type        = string
  # Hidden in plan output, which is posted publicly on pull requests.
  sensitive = true
}

variable "zone_name" {
  description = "The Cloudflare zone the site is served under."
  type        = string
  default     = "amri.dev"
}

variable "subdomain" {
  description = "Subdomain of zone_name the site is served at."
  type        = string
  default     = "liftboard"
}

variable "project_name" {
  description = "Cloudflare Pages project name. Must match --project-name in the deploy workflow."
  type        = string
  default     = "liftboard"
}
