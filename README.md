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

## 🐳 Local Development with Docker

This project uses Docker Compose to run the entire stack (React, NestJS, Python AI, and PostgreSQL) locally with hot-reloading enabled.

> **Note:** You can run the project without using Docker. Follow the instructions in `server/README.md`, `frontend/README.md`, and `ai/README.md`.

### 1. Initial Setup

Create a global `.env` file in the root directory based on your configuration. Minimal example:

```env
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=nestjs_db
DATABASE_URL="postgresql://myuser:mypassword@postgres:5432/nestjs_db?schema=public"

JWT_SECRET=secret
EXPIRY_TIME_MS=3600000

VITE_API_URL=http://localhost:3000
AI_URL=http://localhost:5000
```

### 2. Start the Environment

Run the following command to build the images and start all containers:

```bash
docker compose up --build
```

> **Note:** Use the `--build` flag the first time or whenever you change `Dockerfile`, `package.json`, or `requirements.txt`. For regular starts, just use `docker compose up`.

### 3. Generate Types & Initialize the Database

On a fresh clone, your local folders will mount over the container's generated files. While the containers are running, open a new terminal and generate the Prisma types to clear any NestJS compiler errors:

```bash
docker exec -it checkers_server pnpm prisma generate
```

Next, push the Prisma schema to the empty PostgreSQL database:

```bash
docker exec -it checkers_server pnpm prisma db push
```

> **Note:** To migrate your schema instead, run `docker exec -it checkers_server pnpm prisma migrate dev`.

### 4. Seed the Database (Optional)

If your project includes a seed script, you can populate the database with initial test data:

```bash
docker exec -it checkers_server pnpm prisma db seed
```

> **Tip:** If you ever need to wipe all data and start fresh, run `docker exec -it checkers_server pnpm prisma migrate reset`. This drops the database, recreates it, and runs the seed script.

### 5. Access the Services

Once running, the services are available at:

- **Frontend (React/Vite):** <http://localhost:5173>
- **Backend (NestJS API):** <http://localhost:3000>
- **AI Service (FastAPI Docs):** <http://localhost:5000/docs>

### 6. Development Workflow (Hot-Reload)

- **Code Changes:** Local folders are mapped to the containers via volumes. Saving a file in your IDE will instantly trigger a hot-reload for both React and NestJS.
- **Installing Packages:** To add a new dependency without stopping the environment, execute the command directly inside the container:

  ```bash
  docker exec -it checkers_server pnpm install <package-name>
  ```

  _(Remember to run `docker compose up --build` next time to bake the new package into the image)._

### 7. Stopping the Environment

To stop the containers gracefully:

```bash
docker compose down
```

_(Your database data is safely persisted in a Docker volume)._

### 8. Prisma Studio (Database GUI)

If you want to view or edit your database via the browser using Prisma Studio, you should run it locally on your host machine rather than inside Docker.

Because Prisma Studio must be run from the `server/` directory, **you must copy your global `.env` file into the `server/` folder** so Prisma can resolve the `DATABASE_URL`.

```bash
cd server
pnpm prisma studio
```

> **Troubleshooting:** If you get a `Permission denied` error when trying to run Prisma commands locally, it means Docker created root-owned files in your workspace. To fix this, delete the locked modules and reinstall them as your local user:
>
> ```bash
> sudo rm -rf ../node_modules node_modules ../frontend/node_modules ../packages/shared/node_modules
> pnpm install
> ```

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
