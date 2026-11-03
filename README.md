# liftboard

Explore your Hevy workout history in the browser. Your CSV never leaves your device.

## Local development

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev
```

| Command            | What it does                    |
| ------------------ | ------------------------------- |
| `npm run build`    | Production build to `dist/`     |
| `npm run preview`  | Serve the build                 |
| `npm run check`    | Type-check (svelte-check + tsc) |
| `npm run lint`     | Prettier check + ESLint         |
| `npm run format`   | Format everything with Prettier |
| `npm test`         | Unit tests (Vitest)             |
| `npm run test:e2e` | Smoke test (Playwright)         |
