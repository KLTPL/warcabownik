# Warcabownik

Grupowy projekt Solvro Wakacyjne Wyzwanie 2026 ścieżki Backend i AI/ML

## 👤 Authors

- [Kacper Lebiedziński](https://github.com/kltpl)
- [Dawid Wartalski](https://github.com/dwartalski)
- [Szymon Banasiak](https://github.com/FaziSPB)

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Socket.io-client.
- **Backend:** NestJS, TypeScript, Socket.io, Prisma (PostgreSQL).
- **AI Engine:** Python, FastAPI, PyTorch (Machine Learning model for bot logic).

## 🗂️ Project Structure

For more detailed information head on to other README.md files in the three main directories.

```text
warcabownik/
├── frontend/                 # React (Vite) client
│   ├── src/
│   │   ├── assets/pages/     # Auth.tsx, Game.tsx, Home.tsx
│   │   ├── components/       # UI components (Shadcn)
│   │   ├── context/          # React Context (Auth)
│   │   └── lib/
│   ├── package.json
│   └── vite.config.ts
│
├── server/                   # NestJS backend
│   ├── prisma/               # Database schema
│   ├── src/
│   │   ├── ai/               # AI microservice integration
│   │   ├── auth/             # JWT Authentication
│   │   ├── game/             # Game logic & validation (GameValidatorService)
│   │   └── gateway/          # WebSocket endpoints (GameGateway)
│   ├── docker-compose.yaml   # Local DB/Infrastructure setup
│   └── package.json
│
├── ai/                       # Python AI Microservice
│   ├── CheckersEnv.py        # RL Environment (Model branch)
│   ├── Model.py              # Neural Network architecture (Model branch)
│   ├── Train.py              # Training script (Model branch)
│   ├── checkers_model.pth    # Trained PyTorch weights (Model branch)
│   ├── main.py               # FastAPI communication endpoint
│   └── requirements.txt
│
├── pnpm-workspace.yaml       # Monorepo configuration
└── README.md
```

## 🐳 Local Development with Docker

This project uses Docker Compose to run the entire stack (React, NestJS, Python AI, and PostgreSQL) locally with hot-reloading enabled.

> **Note:** You can run the project without using docker. Follow the instructions in `/server/README.md`, `/frontend/README.md` and `/ai/README.md`

### 1. Initial Setup

Create a global `.env` file in the root directory based on your configuration. Minimal example:

```env
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=nestjs_db
DATABASE_URL="postgresql://myuser:mypassword@postgres:5432/nestjs_db?schema=public"
JWT_SECRET=secret
EXPIRY_TIME_MS=3600000
```

### 2. Start the Environment

Run the following command to build the images and start all containers:

```bash
docker compose up --build
```

> **Note:** Use the `--build` flag the first time or whenever you change `Dockerfile` or `package.json` / `requirements.txt`. For regular starts, just use `docker compose up`.

### 3. Initialize the Database

On the first run (or after clearing volumes), you need to push the Prisma schema to the empty PostgreSQL database. Leave the containers running and open a new terminal:

```bash
docker exec -it checkers_server pnpm prisma db push
```

or deploy a migration

```bash
sudo docker exec -it checkers_server pnpm prisma migrate deploy
```

> **Note:** . To migrate your schema run `sudo docker exec -it checkers_server pnpm prisma migrate dev`

### 4. Seed the Database (Optional)

If your project includes a seed script (configured in `package.json`), you can populate the database with initial test data by running:

```bash
docker exec -it checkers_server pnpm prisma db seed
```

> **Tip:** If you ever need to wipe all data and start fresh, run `docker exec -it checkers_server pnpm prisma migrate reset`. This will drop the database, recreate it, and automatically run the seed script.

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

  _(Remember to run `docker compnpmpose up --build` next time to bake the new package into the image)._

### 7. Stopping the Environment

To stop the containers gracefully:

```bash
docker compose down
```

_(Your database data is safely persisted in a Docker volume)._

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
