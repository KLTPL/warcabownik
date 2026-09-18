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

## Table of Contents

- [Project Structure](#🗂️-project-structure)
- [Local Development with Docker](#🐳-local-development-with-docker)
  - [Initial Setup](#1-initial-setup)
  - [Prisma Studio](#8-prisma-studio-database-gui)
- [Conventional commits](#📝-conventional-commits)

## 🗂️ Project Structure

For more detailed information head on to other README.md files in the three main directories.

```text
warcabownik/
├── docker-compose.yaml       # Local infrastructure orchestration (Postgres, NestJS, React, AI)
├── pnpm-workspace.yaml       # Monorepo workspace mapping
├── .dockerignore             # Excludes local files (like node_modules) from Docker builds
├── README.md                 # Project documentation
│
├── packages/                 # Shared internal libraries
│   └── shared/
│       ├── src/
│       │   └── index.ts      # Central source of truth for shared types and socket events
│       ├── dist/             # Compiled JavaScript output consumed by frontend and backend
│       ├── package.json      # Shared module dependencies and build scripts
│       └── tsconfig.json     # TypeScript compiler settings for the shared package
│
├── frontend/                 # React (Vite) client
│   ├── src/
│   │   ├── pages/            # Route views (Auth.tsx, Game.tsx, Home.tsx)
│   │   ├── components/       # Reusable UI elements (Shadcn components, layouts)
│   │   ├── context/          # Global React state (e.g., AuthContext)
│   │   └── lib/              # Utilities and typed Socket.io client setup
│   ├── package.json          # React client dependencies and scripts
│   ├── vite.config.ts        # Vite bundler configuration and workspace resolution
│   └── Dockerfile            # Container build instructions for the React app
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
│   ├── .env                  # Backend environment variables (DB connection string)
│   ├── package.json          # NestJS backend dependencies and scripts
│   ├── prisma.config.ts      # Custom Prisma CLI configuration
│   └── Dockerfile            # Container build instructions for the NestJS app
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

Open separate terminal tabs (or use a multiplexer) to run the frontend, backend, and shared packages in watch mode on your host machine:

```bash
# Tab 1: Compile shared packages in watch mode
pnpm --filter @warcabownik/shared run dev

# Tab 2: Start the NestJS backend
pnpm --filter @warcabownik/server run start:dev

# Tab 3: Start the React frontend
pnpm --filter @warcabownik/frontend run dev
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
