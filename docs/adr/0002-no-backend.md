# 0002: No backend; data stays in the browser

## Context

A Hevy export is a full training history: dates, times, notes, sometimes bodyweight. People
are rightly wary of uploading that, and a server would add hosting cost, a privacy policy and
something to keep secure, all for a job a browser can do on its own.

## Decision

- Everything runs client-side: parsing in a Web Worker, metrics as pure TypeScript, charts in
  the page.
- The parsed dataset is kept in IndexedDB in the user's own browser, with a "Clear my data"
  button. The kg/lb preference is in `localStorage`.
- The site is static files on Cloudflare Pages. No Workers, databases or analytics on user data.
- No request ever carries workout data. The only fetch is the static `demo.csv`, and routing
  uses the URL hash, which browsers never send to a server.

## Consequences

- The privacy promise is simple to state and to check: open the network tab.
- Data doesn't sync between devices; each browser loads its own export.
- Large exports cost the user's CPU, not ours, which is why parsing runs in a worker.
- Anything that would need a server (sharing a link to someone's stats, accounts) is out of
  scope unless this decision is revisited.
