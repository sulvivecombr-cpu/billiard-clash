# Billiard Clash — Base44 Dev Environment

## Project overview

TypeScript 8-ball pool game (UI in Brazilian Portuguese, pt-BR). npm-workspaces monorepo with three packages:

- **`shared`** — pure game logic (physics, rules, types, network protocol). Must be compiled (`npm run build:shared`) before `server` or `client` can run — both import its compiled CJS/ESM output.
- **`server`** — Express + Socket.IO multiplayer server plus the auth/profile REST API (port 3001). Match state is in memory; user accounts are persisted in PostgreSQL.
- **`client`** — Vite + Canvas single-page app (port 5173).

## Running in the Base44 sandbox

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

Two services:

- **`db`** — `postgres:16`, database `billiard`. Schema (`users` table) is created on server boot via `ensureSchema()`; no separate migration step.
- **`app`** — single container running:
  1. `npm install` at the workspace root (deps hoisted to `/app/node_modules`, kept in a named volume).
  2. `npm run build:shared` — compiles `shared` to `dist/` (CJS) and `dist-esm/` (ESM).
  3. `npm run dev` — starts the server (`tsx watch`) in the background and Vite in the foreground.

- **Client** (web entry point): container port 5173 → host port 3000.
- **Server/API**: container port 3001 → host port 8000.
- `VITE_SERVER_URL` is set to the server's public preview URL; the client uses it both for Socket.IO and for the auth REST API (`/api/auth/*`).
- `CLIENT_ORIGIN` is set to the client's public preview URL for server CORS.

## Auth / profile

- Endpoints (all JSON): `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/profile` (Bearer token).
- Passwords hashed with Node `crypto.scrypt` (no native deps). Tokens are JWTs signed with `JWT_SECRET`.
- `JWT_SECRET` is delivered by the platform via `/run/base44/app.env` (see `.base44/environment.json`). A development placeholder is generated automatically; replace it with a real value for production.
- `DATABASE_URL` is local infra, set inline in compose (not a platform secret).

## Sandbox-specific config

- `client/vite.config.ts` conditionally enables `host: true` and `allowedHosts` only when `BASE44_PREVIEW_MODE === "1"`. Without this, Vite 5.4.21 blocks the sandbox proxy's Host header. When the flag is unset, the original config (localhost-only) is preserved.
- The `shared` package is compiled once at startup. If you edit `shared/src/`, rebuild with `npm run build:shared` (or restart the container).

## Verification

- Vs-Computer mode is fully client-side — works without the server.
- Online multiplayer needs the server reachable from the browser via Socket.IO (host port 8000).
- Registration/profile needs the `db` service healthy and `JWT_SECRET` present.
- Server health check: `GET /health` on port 3001. Client health check: `GET /` on port 5173.
- Unit tests: `npm run test --workspace=shared`, `--workspace=server`, `--workspace=client`.
