# 0004: Terraform for Cloudflare, with state in R2

## Context

The site needs a Cloudflare Pages project, a custom domain (`liftboard.amri.dev`) and a DNS
record. Clicking these together in the dashboard works once, but leaves nothing to review,
nothing to rebuild from and no history of changes. The project is also meant to show
infrastructure-as-code practice.

## Decision

- `infra/` holds Terraform for the Pages project, its custom domain and the proxied CNAME,
  using the Cloudflare provider v5.
- State lives in an R2 bucket through Terraform's S3 backend. The bucket and two credentials
  (a Cloudflare API token and an R2 access key) are the only things created by hand, once.
- Pull requests run `terraform fmt -check` and `validate`, and post `terraform plan` as a
  comment. Pushes to `main` run `terraform apply`, then deploy the site.
- The Pages project is direct-upload: GitHub Actions builds and tests the site and uploads
  `dist/` with Wrangler. Pages never builds anything itself, so what's deployed is exactly
  what CI tested.
- Secrets reach Terraform only as environment variables in CI. No `.tfvars`, state or
  `.terraform/` is ever committed.

## Consequences

- Every infrastructure change is a reviewed diff with a plan attached.
- One workflow concurrency group serialises applies, standing in for state locking.
- The token needs only Pages edit, DNS edit and zone read for `amri.dev`.
- The provider's v5 resources are still settling; `~> 5.0` allows fixes but not a new major.
