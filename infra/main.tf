locals {
  hostname = "${var.subdomain}.${var.zone_name}"
}

data "cloudflare_zone" "site" {
  filter = {
    name = var.zone_name
  }
}

# A direct-upload project: GitHub Actions builds the site and uploads dist/ with wrangler,
# so Pages itself has no Git connection or build settings.
resource "cloudflare_pages_project" "site" {
  account_id        = var.account_id
  name              = var.project_name
  production_branch = "main"
}

resource "cloudflare_pages_domain" "site" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.site.name
  name         = local.hostname
}

# Proxied CNAME to the project's pages.dev address. Pages verifies the custom domain
# through this record.
resource "cloudflare_dns_record" "site" {
  zone_id = data.cloudflare_zone.site.zone_id
  name    = local.hostname
  type    = "CNAME"
  content = cloudflare_pages_project.site.subdomain
  proxied = true
  ttl     = 1 # 1 means "automatic", required for proxied records
  comment = "Liftboard on Cloudflare Pages. Managed by Terraform in AmriArshad/Liftboard."
}
