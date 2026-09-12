# Contributing to CoffeeLog

Thanks for your interest! CoffeeLog is a small, single-user, self-hosted app.
Contributions that keep it simple and self-hostable are very welcome.

## Development setup

```bash
npm install
npm run dev        # web (:5173) + server (:8080)
```

The repo is an npm-workspaces monorepo:

- `server/` — Express + better-sqlite3 API (TypeScript). Data access lives in
  `src/repos/`, transactional logic in `src/services/`, HTTP in `src/routes/`.
  The Express app is built by `buildApp(db)` and the DB connection is dependency-
  injected, so tests run against an in-memory SQLite database.
- `web/` — React + Vite SPA (TypeScript). Screens in `src/screens/`, shared UI
  in `src/components/`, API hooks in `src/api/`. Design tokens are Tailwind v4
  `@theme` variables in `src/theme/tokens.css`.

## Before you open a PR

```bash
npm run typecheck
npm test
npm run build
```

All three must pass. Please add or update tests for behavior changes — the API
integration tests (`server/test/`) are the fastest way to cover new endpoints
and the transactional flows (portioning, consume/undo).

## Conventions

- **Language:** all code, comments, UI copy and docs are in **English**.
  User-entered content is never translated or constrained.
- Match the surrounding code's style; keep dependencies minimal.
- Keep the app runnable as a single Docker image with one SQLite file.

## Scope

CoffeeLog covers the catalog, storage units, QR labels, recipe versioning and the
brew log. See the backlog in the README before proposing larger features, and
**[docs/API.md](docs/API.md)** for the HTTP surface — it is a documented
interface, not an internal detail, so changes to it belong in that file too.
