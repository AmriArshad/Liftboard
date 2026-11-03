# 0001: Vite + Svelte 5 + TypeScript

## Context

Liftboard is a static, client-only dashboard. It has to load fast on phones, stay small enough to
host on Cloudflare Pages' free tier, and be easy to read for both people and coding agents.

## Decision

- **Vite** for the dev server and build: fast, minimal config, first-class Svelte support.
- **Svelte 5** for the UI. It compiles away, so the shipped runtime is small, and runes keep
  reactive state explicit without hook rules or a separate state library.
- **TypeScript in strict mode** (plus `noUncheckedIndexedAccess`), because the core of the app is
  parsing untrusted CSV rows into a typed model.
- **Vitest** for unit tests (shares Vite's config) and **Playwright** for one smoke test against the
  production build.
- **ESLint + Prettier**: Prettier formats, ESLint catches bugs, and `eslint-config-prettier` stops
  them overlapping.
- **npm**, pinned to Node 24 via `.nvmrc`.

## Consequences

- No SvelteKit: there is no server, and one page doesn't need a router yet. Revisit if routes appear.
- Parsing and metrics stay framework-free TypeScript, so most tests never touch Svelte.
- Svelte is less common than React, so non-obvious Svelte behaviour gets a short comment.
