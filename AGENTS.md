# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

Warcabownik is a real-time multiplayer Checkers app: a NestJS backend, React (Vite) frontend, and a Python FastAPI AI microservice, sharing types through a `@warcabownik/shared` workspace package. Gameplay moves flow over Socket.io; the AI service is called by the backend for bot moves.

## Development Workflow

This is a **hybrid** setup: Docker Compose runs only infrastructure (Postgres + the Python AI service); the Node apps (frontend, server, shared) run on the host via pnpm.

```bash
# one-time env setup
cp .env.example .env && cp server/.env.example server/.env && cp frontend/.env.example frontend/.env

# start infra (Postgres + AI container)
docker compose up -d --build

# install deps (pnpm is enforced via preinstall hooks; yarn/npm will fail)
pnpm install

# sync DB schema + generate Prisma client (run from server/)
cd server && pnpm prisma db push && pnpm prisma generate

# run shared/server/frontend concurrently in watch mode (from repo root)
pnpm run dev
```

- Frontend: http://localhost:5173 · Backend: http://localhost:3000 · AI docs: http://localhost:5000/docs
- `pnpm prisma migrate dev` for migrations instead of `db push`; `pnpm prisma db seed` to seed mock data; `pnpm prisma studio` for a DB GUI (must be run from `server/` so it can resolve `DATABASE_URL`).
- The `packages/shared` package must be built/watched (`pnpm --filter @warcabownik/shared run dev`, already included in root `pnpm run dev`) for the frontend/server to pick up type changes — it's consumed via `dist/`, not source.

## Common Commands

Run per-workspace with `pnpm --filter @warcabownik/<name> run <script>`, or `cd` into the package.

**server/** (NestJS):
- `pnpm start:dev` — watch mode
- `pnpm test` / `pnpm test:watch` / `pnpm test:cov` — Jest unit tests (`*.spec.ts`, colocated with source, `rootDir: src`)
- `pnpm test:e2e` — e2e tests via `test/jest-e2e.json`
- Run a single test: `pnpm jest path/to/file.spec.ts` or `pnpm jest -t "test name"`
- `pnpm lint` — ESLint with `--fix`
- `pnpm build` — Nest build

**frontend/** (Vite/React):
- `pnpm dev` — Vite dev server
- `pnpm build` — `tsc -b && vite build` (typecheck then bundle)
- `pnpm lint` — ESLint
- `pnpm format` — Prettier write
- `pnpm api:generate` — regenerate `src/api/` (models + endpoints) from the backend's OpenAPI schema via Orval; run this after backend DTO/controller changes

**ai/** (Python/FastAPI):
- Runs inside Docker via `docker compose up`; see `ai/Dockerfile` and `ai/requirements.txt`.
- `Train.py` trains the RL model (`CheckersEnv.py` env, `Model.py` architecture) producing `checkers_model.pth`, which `main.py` loads to serve move predictions.

## Architecture

### Shared types (`packages/shared/src/index.ts`)
The single source of truth for cross-service contracts: `SocketEvents` enum, `ClientToServerEvents`/`ServerToClientEvents` interfaces, and game DTOs (`GameState`, `MovePayload`, `PlayerMoveResponse`). Both `server` and `frontend` import from `@warcabownik/shared` (built to `dist/`) instead of redefining these types — when changing socket contracts or shared game types, edit here first, then rebuild (`pnpm --filter @warcabownik/shared run build`) before the change is visible elsewhere.

### Backend (`server/src`)
- `game/` — core checkers domain logic: `game.service.ts` (game state/persistence), `game-validator.service.ts` (move legality rules), `board.utils.ts` (board array helpers), `game.constants.ts`. This is where checkers rules live, independent of transport.
- `gateway/game/game.gateway.ts` — Socket.io gateway; listens for `ClientToServerEvents` (e.g. `JOIN_GAME`, `SEND_PLAYER_MOVE`), delegates to `game/` services, and emits `ServerToClientEvents` (`GAME_STATE_UPDATE`, `MOVE_ERROR`). Real-time moves flow through here, not through `game.controller.ts` (which exposes REST endpoints like game history).
- `ai/ai.service.ts` — HTTP client to the Python AI microservice; called by the game logic when the opponent is a bot.
- `auth/` — JWT auth plus Google/GitHub OAuth strategies (Passport), guards for both REST (`jwt-auth.guard.ts`) and WS (`ws-jwt-auth.guard.ts`) contexts.
- `prisma/` — `PrismaService` wraps the generated client (output to `server/generated/prisma`, not the default location — import from there, not `@prisma/client`).
- Board state is persisted as a JSON string (`boardStateJson`) on the `Game` model, not as normalized cell rows.

### Frontend (`frontend/src`)
- `api/` is **generated** by Orval from the backend's OpenAPI schema (`pnpm api:generate`) — don't hand-edit `api/models/` or `api/endpoints/`.
- `lib/` holds the typed Socket.io client setup consuming `@warcabownik/shared` event types.
- `context/AuthContext.tsx` — global auth state; `hooks/useGame.ts` — game/socket state hook consumed by `pages/Game.tsx`.
- UI primitives in `components/ui/` follow shadcn conventions.

### AI microservice (`ai/`)
- `CheckersEnv.py` defines the RL environment (board representation matches the server's: `1`/`2` for men, `3`/`4` for kings, `0` empty).
- `main.py` is a thin FastAPI wrapper that loads `checkers_model.pth` and exposes a move-prediction endpoint consumed by `server/src/ai/ai.service.ts`.

## Conventional Commits

`<type>(<optional scope>): <description in imperative mood>`

Types: `feat`, `fix`, `refactor`, `sick` (boring housekeeping: repo init, build bumps, releases), `docs`, `test`.
