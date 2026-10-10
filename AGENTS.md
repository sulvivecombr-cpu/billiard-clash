# Billiard Clash — Base44 Dev Environment

## Project overview

TypeScript 8-ball pool game. npm-workspaces monorepo with three packages:

- **`shared`** — pure game logic (physics, rules, types, network protocol). Must be compiled (`npm run build:shared`) before `server` or `client` can run — both import its compiled CJS/ESM output.
- **`server`** — Express + Socket.IO multiplayer server (port 3001). In-memory match state, no database.
- **`client`** — Vite + Canvas single-page app (port 5173).

No secrets or API keys are required anywhere.

## Running in the Base44 sandbox

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

The single `app` service:
1. `npm install` at the workspace root (deps hoisted to `/app/node_modules`, kept in a named volume).
2. `npm run build:shared` — compiles `shared` to `dist/` (CJS) and `dist-esm/` (ESM).
3. `npm run dev` — starts the server (`tsx watch`) in the background and Vite in the foreground.

- **Client** (web entry point): container port 5173 → host port 3000.
- **Server**: container port 3001 → host port 8000.
- `VITE_SERVER_URL` is set to the server's public preview URL so the browser can connect Socket.IO.
- `CLIENT_ORIGIN` is set to the client's public preview URL for server CORS.

## Sandbox-specific config

- `client/vite.config.ts` conditionally enables `host: true` and `allowedHosts` only when `BASE44_PREVIEW_MODE === "1"`. Without this, Vite 5.4.21 blocks the sandbox proxy's Host header. When the flag is unset, the original config (localhost-only) is preserved.
- The `shared` package is compiled once at startup. If you edit `shared/src/`, rebuild with `npm run build:shared` (or restart the container).

## Verification

- Vs-Computer mode is fully client-side — works without the server.
- Online multiplayer needs the server reachable from the browser via Socket.IO (host port 8000).
- Server health check: `GET /health` on port 3001.
- Client health check: `GET /` on port 5173.
