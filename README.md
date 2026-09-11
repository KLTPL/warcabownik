# final-project-solvro-backend-wakacyjne-wyzwanie-2026

Grupowy projekt Solvro Wakacyjne Wyzwanie 2026 ścieżki Backend

## 👤 Authors

- [Kacper Lebiedziński](https://github.com/kltpl)
- [Dawid Wartalski](https://github.com/dwartalski)
- [Szymon Banasiak](https://github.com/FaziSPB)

## ⚙️ Project setup

### Running localy

1. Clone the repository

   ```
    git clone https://github.com/KLTPL/final-project-solvro-backend-wakacyjne-wyzwanie-2026
    cd final-project-solvro-backend-wakacyjne-wyzwanie-2026
   ```

2. Create .env

   ```
   # For prisma
   DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/nestjs_db?schema=public"

   # For docker
   POSTGRES_USER="myuser"
   POSTGRES_PASSWORD="mypassword"
   POSTGRES_DB="nestjs_db"


   # JWT
   JWT_SECRET=
   EXPIRY_TIME_MS=
   ```

3. Turn on docker database

   ```
   sudo docker-compose up -d
   ```

4. Download packages

   ```
   pnpm install
   ```

5. Generate prisma

   ```
   pnpm prisma generate
   ```

6. Run the dev command

   ```
   pnpm dev:start
   ```

#### To seed the database run

```
pnpm prisma db seed
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
