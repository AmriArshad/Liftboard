# CLAUDE.md

## Project

**Liftboard** is a dashboard that runs entirely in the browser. You load a Hevy workout CSV export and explore your training history in it. Anyone can use it: export from Hevy (Settings → Export & Import Data → Export Workouts), drop the CSV on the page, and explore.

It's a portfolio project for Amri (amri.dev). It should show clean frontend work, CI/CD and Cloudflare hosting, and it should have a tidy commit history.

### Principles
I want this to be as perfect as Linear's website or Apple Notes: simple purpose, simple architecture, simple design, simple implementation.

- Cut taglines, helper text and secondary labels. If a screen needs them to make sense, fix the layout.
- Every decision should improve the user experience (UX), developer experience (DX) and agent experience (AX) at the same time, without breaking anything.

### Hard rules
- **No backend and no uploads.** CSV data never leaves the user's browser. No analytics on user data, and no network requests that include workout data.
- **Static hosting only.** Deploys to Cloudflare Pages on the free tier. Don't add Workers, D1, KV or any server unless Amri asks.
- **Never commit real workout data.** Test fixtures must be small, anonymised or synthetic CSVs in `tests/fixtures/`.

### Brand
- Name: Liftboard, written as lowercase `liftboard` in the wordmark.
- Logo: a rising progress line ending in a dot, on a near-black rounded square. Files are in `public/brand/`: `icon.svg` (also used as `favicon.svg`), `mark.svg` (uses `currentColor`), `logo-dark.svg`, `logo-light.svg`.
- Colours: background `#0E0F12`, accent `#D4FF3F` (use it sparingly: the active state, the selected series, PR highlights), text `#F4F4F5` on dark and `#0E0F12` on light.
- Font: Inter, falling back to the system font.

## Stack

- Vite + Svelte 5 + TypeScript (strict)
- Papa Parse for CSV parsing (with `worker: true` for large files)
- Apache ECharts for charts (import only the modules that are used, to keep the bundle small)
- `idb-keyval` for saving the parsed dataset to IndexedDB
- Vitest for unit tests and Playwright for a smoke test
- ESLint + Prettier
- npm (not pnpm or yarn)
- Terraform (Cloudflare provider) for all infrastructure, with state in Cloudflare R2
- `vite-plugin-pwa` for offline support (v0.3)

## Commands

```bash
npm install
npm run dev        # local dev server
npm run build      # production build to dist/
npm run preview    # serve the build
npm run check      # svelte-check + tsc
npm run lint
npm test           # vitest
npm run test:e2e   # playwright
```

Before you say a task is done, run `npm run check && npm run lint && npm test`.

## Structure

```
src/
  lib/
    parse/        # CSV → typed model. Pure functions, no DOM.
      hevy.ts     # header detection, row parsing, unit + date handling
      types.ts
    metrics/      # pure functions over the model (e1RM, volume, PRs, stalls)
    store/        # Svelte stores/runes: dataset, filters, unit preference
    persist.ts    # IndexedDB load/save/clear
  components/
    charts/       # one ECharts wrapper per chart type
    ...
  routes or views/
  App.svelte
infra/            # Terraform: Pages project, custom domain, DNS
docs/
  adr/            # Architecture Decision Records: 0001-why-svelte.md, ...
tests/
  fixtures/       # synthetic CSVs: kg export, lb export, odd dates, cardio, bodyweight
  unit/
  e2e/
```

Keep parsing and metrics as pure, framework-free TypeScript so they're easy to test. Components only display data and handle interaction.

## Hevy CSV format

Header from a real kg export (one row per set):

```
"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
```

Parsing rules:
- **Group workouts** by `title` + `start_time`.
- **Units:** detect from the header. kg exports have `weight_kg` / `distance_km`. Imperial exports are expected to use `weight_lbs` / `distance_miles` instead. This hasn't been checked against a real lb export yet, so detect column names flexibly and fail with a clear message if no weight column is found. Store everything internally in kg/km and convert only for display.
- **Dates** look like `2 Nov 2026, 17:26` (local time, no timezone). The format may change with the phone's locale, so write a tolerant parser with tests. Don't rely on `new Date(string)`.
- **`set_type`** values include `warmup`, `normal`, `failure`, `dropset`. Leave warmups out of all strength and volume metrics.
- **Bodyweight exercises** (e.g. `Pull Up`, `Triceps Dip`) have an empty weight. Track them by reps. Weighted variants (`Pull Up (Weighted)`) are separate exercises, and their weight is the added load.
- **Cardio** (e.g. `Walking`, `Cycling`) uses `distance_km` / `duration_seconds`, not weight and reps.
- Empty cells mean `null`, not `0`.
- Text fields can contain emoji and commas. Let Papa Parse handle quoting.
- If the file is invalid (wrong headers, not a CSV), reject it with a short, clear error.

## Metrics

- **Estimated 1RM:** Epley formula, `weight × (1 + reps / 30)`, only for sets of 1–12 reps.
- **Volume:** sum of `weight × reps` over non-warmup weighted sets.
- **Top set:** the heaviest non-warmup set in a session, with its reps.
- **PR:** a new best e1RM, best weight, or best reps at a given weight for an exercise.
- **Stalled lift:** an exercise trained at least 4 times in the last 6 weeks whose best e1RM hasn't gone above its previous best. Make the window configurable.

## v0.1 scope

1. Upload screen: a CSV drop zone and a demo button. Nothing else.
2. Overview: total workouts, date range, a workouts-per-week heatmap, weekly volume and weekly set count.
3. Exercise explorer: a searchable picker, charts of top set and e1RM over time, and a session history table.
4. PR list and a "stalled lifts" panel.
5. Saved in IndexedDB, with a "clear my data" button.
6. Toggle between kg and lb. Dark mode follows the system setting.
7. Responsive. Lots of people will open this on their phones.

## v0.2: CI/CD and infrastructure as code

1. `infra/` Terraform manages the Cloudflare Pages project, custom domain and DNS record. Remote state goes in an R2 bucket (S3 backend). Nothing gets created by hand in the dashboard (except the R2 state bucket and API token, which are created once to bootstrap).
2. PR workflow: check, lint, unit tests, build, Playwright e2e, Lighthouse CI (budgets: performance, accessibility, best practices ≥ 95), bundle-size limit (`size-limit`), and `terraform fmt -check` + `validate` + `plan`. The plan output gets posted as a PR comment.
3. A preview deploy for every PR, with its URL posted as a PR comment.
4. Push to `main`: `terraform apply`, then a production deploy.
5. release-please creates version tags, the CHANGELOG and GitHub Releases from Conventional Commits.
6. Branch protection on `main`: required checks, no direct pushes.

## v0.3: PWA and hardening

1. PWA: installable and works offline once loaded. The app shell is cached, and data stays in IndexedDB.
2. Security headers in `public/_headers`: strict CSP (`default-src 'self'; connect-src 'self'`), HSTS, `Referrer-Policy`, `Permissions-Policy`.
3. Renovate (or Dependabot) for dependency updates, CodeQL scanning, and the OpenSSF Scorecard workflow plus a badge.
4. Pin GitHub Actions to commit SHAs. Give workflows least-privilege `permissions:`.

## Docs

- `README.md`: one-line purpose, a screenshot, a live link, how to export from Hevy, the privacy guarantee, a Mermaid architecture diagram, local dev, and badges (CI, Scorecard, release). Keep it short.
- `docs/adr/`: write a short ADR (context, decision, consequences) for every significant decision, including the stack, no backend, ECharts and Terraform. Check the ADRs before you revisit one of those decisions.

Later ideas (don't build these unless asked): muscle-group split, comparing two exports side by side, a shareable PNG summary.

## Deployment

- For v0.1, just deploy: on push to `main`, deploy `dist/` to Cloudflare Pages using `cloudflare/wrangler-action`. v0.2 replaces this with the full pipeline above.
- Secrets: `CLOUDFLARE_API_TOKEN` (scoped to Pages, DNS and R2 only), `CLOUDFLARE_ACCOUNT_ID`, and the R2 state credentials. Never hard-code them. Never commit `.tfstate`, `.tfvars` with secrets, or `.terraform/`.
- Custom domain on amri.dev (DNS already on Cloudflare).

## Git conventions

- Small, focused commits using Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `ci:`).
- Do work on feature branches (`feat/upload`, `feat/exercise-explorer`) and merge through PRs. Tag releases (`v0.1.0`).
- **Don't add `Co-Authored-By` lines or session-link trailers to commit messages.**
- Don't commit or push unless Amri asks.

## Working with Amri

- Amri is an IT Ops specialist moving towards SysAdmin/DevOps. He's comfortable with PowerShell, CI and infra, and has worked with React/Redux before. Svelte is new to him, so point out where it differs from React (runes vs hooks, stores vs Redux).
- He wants to learn the codebase, so after each change, briefly explain what changed in which file and why, and suggest a commit message.
- Prefer clear, readable code to clever code. Add comments where Svelte or ECharts behaviour isn't obvious.
- Ask before adding a new dependency.
