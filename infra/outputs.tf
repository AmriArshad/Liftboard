output "url" {
  description = "The site's public address."
  value       = "https://${local.hostname}"
}

output "pages_dev_url" {
  description = "The project's pages.dev address, which also serves the latest production deploy."
  value       = "https://${cloudflare_pages_project.site.subdomain}"
}
