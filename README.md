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
