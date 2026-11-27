# Warcabownik (Checkers)

Grupowy projekt Solvro Wakacyjne Wyzwanie 2026 ścieżki Backend i AI/ML

**Warcabownik** is a modern, real-time multiplayer Checkers application featuring a dedicated AI opponent trained via Reinforcement Learning. Containerized with Docker, providing instant hot-reloading and painless local development.

## 👤 Authors

- [Kacper Lebiedziński](https://github.com/kltpl)
- [Dawid Wartalski](https://github.com/dwartalski)
- [Szymon Banasiak](https://github.com/FaziSPB)

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Socket.io-client.
- **Backend:** NestJS, TypeScript, Socket.io, Prisma (PostgreSQL).
- **AI Engine:** Python, FastAPI, PyTorch (Machine Learning model for bot logic).

## 📃 Table of Contents

- [Project Structure](#🗂️-project-structure)
- [Local Development (Hybrid Workflow)](#🐳-local-development-hybrid-workflow)
  - [Environment Setup](#1-environment-setup)
  - [Prisma Studio](#8-prisma-studio-database-gui)
- [PR Previews](#🔍-pr-previews)
- [Conventional commits](#📝-conventional-commits)

## 🗂️ Project Structure

For more detailed information head on to other README.md files in the three main directories.

```text
warcabownik/
├── docker-compose.yaml       # Local infrastructure orchestration (Postgres and Python AI only)
├── package.json              # Monorepo root config, package manager enforcement, and concurrent dev scripts
├── pnpm-workspace.yaml       # Monorepo workspace mapping
├── .env.example              # Default Docker infrastructure variables (Postgres credentials)
├── .dockerignore             # Excludes local files (like node_modules) from Docker builds
├── README.md                 # Project documentation
│
├── packages/                 # Shared internal libraries
│   └── shared/
│       ├── src/
│       │   └── index.ts      # Central source of truth for shared types and socket events
│       ├── dist/             # Compiled JavaScript output consumed by frontend and backend
│       ├── package.json      # Shared module dependencies (@warcabownik/shared)
│       └── tsconfig.json     # TypeScript compiler settings for the shared package
│
├── frontend/                 # React (Vite) client
│   ├── src/
│   │   ├── pages/            # Route views (Auth.tsx, Game.tsx, Home.tsx)
│   │   ├── components/       # Reusable UI elements (Shadcn components, layouts)
│   │   ├── context/          # Global React state (e.g., AuthContext)
│   │   └── lib/              # Utilities and typed Socket.io client setup
│   ├── .env.example          # Default frontend environment variables (Localhost API/AI URLs)
│   ├── package.json          # React client dependencies (@warcabownik/frontend)
│   ├── vite.config.ts        # Vite bundler configuration and workspace resolution
│   └── Dockerfile            # Production container build instructions for the React app
│
├── server/                   # NestJS backend
│   ├── prisma/
│   │   ├── schema.prisma     # Database models and ORM configuration
│   │   └── seed.ts           # Database initialization and mock data script
│   ├── generated/
│   │   └── prisma/           # Auto-generated Prisma database client and enums
│   ├── src/
│   │   ├── ai/               # Integration with the Python AI microservice
│   │   ├── auth/             # JWT authentication, guards, and login strategies
│   │   ├── game/             # Core checkers domain logic and move validation
│   │   └── gateway/          # WebSocket event listeners and emitters
│   ├── .env.example          # Default backend environment variables (Localhost DB URL)
│   ├── package.json          # NestJS backend dependencies (@warcabownik/server)
│   ├── prisma.config.ts      # Custom Prisma CLI configuration
│   └── Dockerfile            # Optimized, multi-stage production container for the NestJS app
│
└── ai/                       # Python AI Microservice
    ├── main.py               # FastAPI server exposing move-prediction endpoints
    ├── CheckersEnv.py        # Reinforcement learning environment modeling checkers rules
    ├── Model.py              # PyTorch neural network architecture
    ├── Train.py              # Training script for the AI model
    ├── checkers_model.pth    # Saved PyTorch model weights
    ├── requirements.txt      # Python dependencies (FastAPI, PyTorch, Uvicorn)
    └── Dockerfile            # Container build instructions for the FastAPI app
```

## 🐳 Local Development (Hybrid Workflow)

This project uses a hybrid development approach. Docker Compose is used to run the infrastructure (PostgreSQL and the Python AI service), while the Node.js applications (React frontend, NestJS backend, and Shared packages) run directly on your host machine.

### 1. Environment Setup

Copy the example environment files to create your own local configurations:

```bash
cp .env.example .env
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env
```

### 2. Start the Infrastructure

Run the following command to build the AI image and start the database in the background:

```bash
docker compose up -d --build
```

### 3. Install Node.js Dependencies

With your infrastructure running, install the monorepo dependencies on your local machine:

```bash
pnpm install
```

### 4. Initialize the Database & Generate Types

Before starting the server, you need to sync the Prisma schema with your running PostgreSQL database and generate the local TypeScript definitions:

```bash
cd server
pnpm prisma db push
pnpm prisma generate
```

> **Note:** To use migrations instead of a direct schema push, run `pnpm prisma migrate dev`. To populate the database with initial test data, run `pnpm prisma db seed`.

### 5. Start the Development Servers

Run the frontend, backend, and shared packages in watch mode on your host machine:

```bash
pnpm run dev
```

### 6. Access the Services

Once running, the services are available at:

- **Frontend (React/Vite):** <http://localhost:5173>
- **Backend (NestJS API):** <http://localhost:3000>
- **AI Service (FastAPI Docs):** <http://localhost:5000/docs>

### 7. Stopping the Environment

To stop the background Docker containers (database and AI):

```bash
docker compose down
```

_(Your database data is safely persisted in a Docker volume)._ To stop the Node.js servers, simply press `Ctrl+C` in their respective terminal tabs.

### 8. Prisma Studio (Database GUI)

You can view or edit your database via the browser using Prisma Studio.

```bash
cd server
pnpm prisma studio
```

> **Note:** Because Prisma Studio runs from the `server/` directory, ensure your `.env` file is accessible to it so it can resolve the `DATABASE_URL`.

## 🔍 PR Previews

Every pull request gets its own full stack, deployed by `.github/workflows/preview.yml`. The URLs are posted as a PR comment.

| Part | Where | Notes |
|---|---|---|
| Database | Neon branch `preview/pr-<N>` | Copied from production, migrated with `prisma migrate deploy`, deleted when the PR closes |
| Backend | Render PR preview | Created by Render; the workflow points it at the Neon branch, the preview frontend and its own `JWT_SECRET` |
| AI | Vercel preview | Only deployed when the PR changes `ai/`; otherwise the production AI is used |
| Frontend | Cloudflare Pages project `warcabownik-preview`, alias `pr-<N>` | Built with `VITE_SERVER_URL` pointing at the backend preview |

The backend refuses to start as a preview until the workflow has rewired it (`server/src/preview-guard.ts`), so the first Render deploy of a new PR fails on purpose. OAuth login does not work in previews; use email and password. Put `[skip preview]` in the PR title to skip the preview.

Required repository settings:

| Kind | Name |
|---|---|
| Secret | `NEON_API_KEY`, `RENDER_API_KEY`, `CLOUDFLARE_API_TOKEN` (Account → Cloudflare Pages → Edit), `CLOUDFLARE_ACCOUNT_ID`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| Variable | `NEON_PROJECT_ID`, `RENDER_SERVICE_ID`; optional `NEON_DATABASE` (default `neondb`), `NEON_ROLE` (default `neondb_owner`), `CF_PREVIEW_PROJECT` (default `warcabownik-preview`) |

## 📝 Conventional Commits

The commit structure should look like this:
`<type>(<optional scope>): <description in imperative mood>`

### Available types

- **`feat:`** – change introducing new functionalities
- **`fix:`** – change to repair existing functionalities
- **`refactor:`** – refactoring/refactoring, change does not make changes in functionalities, only changes the structure/way of execution
- **`sick:`** – 'boring' activity, e.g. initialization of repo, raising of the build number, release
- **`docs:`** – change of documentation (e.g. README, LICENSE).
- **`test:`** – adding or improving tests
