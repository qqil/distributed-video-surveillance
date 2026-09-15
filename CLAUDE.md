# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A take-home assignment ("Backend.js Test Assignment: Distributed Video Surveillance System" — see the
PDF in the repo root) implementing a distributed system that lets an authenticated user view an RTSP
camera stream and send start/stop/status commands to it. Four independent services, each with its own
`package.json`/lockfile/`pnpm-workspace.yaml` (there is no root workspace — treat each as a separate
project and `cd` into it before running package-manager commands):

- **`camera-simulator`** — spawns a bundled `ffmpeg` binary (`bin/linux64/ffmpeg`) to publish a synthetic
  test pattern to an RTSP server as a stand-in for a real camera.
- **`mediamtx`** (not a Node app — the `bluenviron/mediamtx` Docker image, config at root `mediamtx.yml`)
  — the RTSP media server the camera publishes to and clients read from.
- **`server-a`** — internal-facing service. Runs a Fastify HTTP server (WebSocket endpoint at
  `/stream`, intended to relay/proxy the media stream) *and* a gRPC server (`StreamManager` service:
  `StartVideo`/`StopVideo`/`GetStatus`) that `server-b` calls to control the camera pipeline.
- **`server-b`** — public-facing/edge service. Owns user auth (JWT-in-httpOnly-cookie) and is the only
  service the frontend talks to. Proxies operator commands from a WebSocket connection to `server-a`'s
  gRPC service.
- **`frontend`** — TanStack Start (React 19) app; authenticates against `server-b` and will render the
  live stream. Has its own `frontend/CLAUDE.md` with frontend-specific detail — read it when working
  there.

Request flow: browser ↔ `server-b` (auth, WS command channel) ↔ gRPC ↔ `server-a` (stream control) ↔
mediamtx (RTSP) ↔ camera-simulator (publishes) / frontend (eventually reads, via `server-a`'s `/stream`
WS).

Ignore `tpm/` — leftover/unrelated scratch content, not part of this system.

Root `README.md` has human-facing run instructions (dev vs. prod-mode compose invocation) and the two
seeded login users (`admin`/`password123`, role `operator`; `viewer`/`password123`, role `viewer`).
Root `SOLUTION.md` has an architecture diagram (`solution.png`) and a short known-limitations list
(cookie removal doesn't kill an active WS session; no command queue on `server-a`; no gRPC auth between
`server-a`/`server-b`).

## Commands

Every package uses **pnpm** and Node `>=24 <25`. Run from inside the relevant package directory:

```bash
pnpm install
pnpm run start:dev   # tsx watch src/main.ts (or src/ffmpeg.ts for camera-simulator) — hot reload
pnpm run build       # tsc -p tsconfig.build.json -> dist/
pnpm run start       # node dist/main.js — run the built output
pnpm run lint        # eslint . (server-b also has lint:fix)
```

`server-b` additionally has `pnpm run generate-grpc`, which regenerates
`server-b/src/grpc/stream-manager.ts` (ts-proto client stubs) from `stream-manager.proto` via
`grpc_tools_node_protoc`. `server-a`'s `src/grpc/stream-manager.ts` is hand-written server-side handler
stubs, not generated — the two `stream-manager.ts` files in `server-a` and `server-b` are different
things despite the shared name.

No test suite exists in any package yet (`pnpm test` is a placeholder that exits 1).

### Running the full stack

```bash
docker compose up --build
```

Brings up `mediamtx`, `server-a` (port 3000), `server-b` (host port 3001 → container 3000), and
`frontend` (host port 80 → container 3000), each with a bind-mounted source dir and `tsx watch` via the
Dockerfile's `dev` build target. There's no compose service for `camera-simulator` — run it manually
(`pnpm run start:dev` inside `camera-simulator/`) pointed at the mediamtx RTSP port (`8554`, credentials
`admin`/`admin123` per `mediamtx.yml`).

For a prod-like run, layer `docker-compose.prod.yml` on top:
`docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build`. It drops the dev bind
mounts and `dev` build target (uses the built image instead) and leaves env vars to be supplied
externally rather than hardcoded — see `README.md` for the exact invocation.

The camera/mediamtx stream path is configured via `MEDIAMTX_STREAM_PATH` (`server-a/src/config.ts`,
default `"camera"`), which already agrees with `camera-simulator/src/ffmpeg.ts`'s RTSP publish path
(`/camera`) and `mediamtx.yml`'s `camera:` path entry — no path mismatch to fix here currently.

## Architecture notes

- **Auth**: `server-b` is the only issuer/verifier of JWTs in normal operation — `POST /auth/login`
  (`server-b/src/controllers/auth.controller.ts`) checks credentials against `server-b/users.json`
  (bcrypt-hashed passwords, roles `viewer`/`operator` — see `src/types/user.ts`) and sets the token as
  an httpOnly `token` cookie. `src/middleware/auth.middleware.ts` (`authenticate` + role-based
  `authorize`) guards `/protected/*` (both hooks). `/ws/*` only gets `authenticate` at the router level
  (`src/router/ws.router.ts`) — role checks for WS commands (`START_VIDEO`/`STOP_VIDEO` require
  `operator`) are done ad hoc inside `services/command.service.ts`, not via the `authorize` middleware.
  **`server-a` has its own copy** of `auth.middleware.ts`/`auth.service.ts`/`types/user.ts` (each marked
  with its own `// TODO: should be moved to a shared middleware package` /
  `// TODO: should be moved to a shared service package` /
  `// TODO: should be moved to a shared types package` comment) that only verifies tokens signed with
  the same `JWT_SECRET` — keep the two in sync manually if the auth logic changes.
- **Command flow**: the frontend opens a WebSocket to `server-b` `/ws/` (auth-gated, same cookie).
  `server-b/src/controllers/ws.controller.ts` reads text commands (`START_VIDEO`/`STOP_VIDEO`/
  `GET_STATUS`/`LOGOUT`, see `src/types/command.ts`), validates them, and
  `services/command.service.ts` dispatches to `grpc/stream-manager.client.ts`, a gRPC client to
  `server-a`. `server-a`'s gRPC handlers (`src/grpc/stream-manager.ts`) now drive mediamtx for real via
  WebRTC/WHEP (not ffmpeg): `StopVideo`/`GetStatus` call into `src/services/mediamtx.service.ts` (WHEP
  session tracking — `negotiate`/`endSession`/`registerSession`/`isStreamRunning`, etc., built on the
  WHEP HTTP client in `src/lib/mediamtx-client.ts`) and reflect real stream state; `StartVideo` still
  fires `mediamtxService.startVideo()` without awaiting/checking it and unconditionally returns success.
  `ws.controller.ts` also tracks a `clientMap` (login → open sockets) in both `server-a` and `server-b`
  so multiple tabs/devices per user can be addressed, but nothing currently pushes server-initiated
  messages through it.
- **Proto contract**: `stream-manager.proto` is duplicated verbatim in `server-a/src/grpc/` and
  `server-b/src/grpc/` (no shared package) — edit both if the RPC contract changes, and re-run
  `server-b`'s `generate-grpc` script afterward.
- **Config**: each server reads env vars with defaults in `src/config.ts` (`JWT_SECRET`, `LOG_LEVEL`,
  and per-service vars — `GRPC_PORT`, `MEDIAMTX_API_URL`, `MEDIAMTX_WEBRTC_URL`, `MEDIAMTX_USER`/
  `MEDIAMTX_PASSWORD`, `MEDIAMTX_STREAM_PATH` in `server-a`; `FRONTEND_ORIGIN`, `SERVER_A_GRPC_URL`,
  `JWT_EXPIRES_IN`, `JWT_ALG` in `server-b`). No `.env.example` exists yet; defaults match the
  docker-compose values. There's also in-progress, not-yet-wired-up JWKS-based inter-service auth
  scaffolding: `server-a` declares `JWKS_URL` (unused), `server-b`'s compose env carries
  `STREAM_TOKEN_PRIVATE_KEY`, and `server-b/src/main.ts` has a `/.well-known/jwks.json` route
  commented out.
- **Logging**: both servers use a shared-shape `pino` wrapper at `src/services/logger.service.ts`
  (pretty-printed via `pino-pretty` in dev, level from `config.logLevel`).
- **Fastify plugin structure**: `main.ts` registers `helmet`, `cookie`, and `websocket` globally, then
  mounts routers under a prefix (`/auth`, `/ws`, `/protected` on `server-b`; `/stream` on `server-a`).
  Each router (`src/router/*.ts`) wires paths to a controller (`src/controllers/*.ts`); controllers call
  into `src/services/*.ts` for logic. Follow this router → controller → service layering for new
  endpoints rather than putting logic directly in routers.

## Conventions

- TypeScript everywhere, `strictNullChecks`, ESLint via `typescript-eslint` `recommendedTypeChecked` +
  `eslint-plugin-prettier`; `server-a`/`server-b` share an identical `eslint.config.mts`
  (`no-explicit-any` is off; `no-floating-promises`/`no-unsafe-argument` are warnings, not errors).
- `commands.log` files under `server-a/`/`server-b/` are written by each service's
  `src/services/command-logger.service.ts` (a dedicated pino sink logging gRPC/command events) — not
  shell history. They're still not build output or documentation, so don't treat them as a source of
  truth for current behavior.
