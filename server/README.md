# Warcabownik server

## ⚙️ Project setup

### Running localy

1. Clone the repository

   ```
    git clone https://github.com/KLTPL/final-project-solvro-backend-wakacyjne-wyzwanie-2026
    cd warcabownik/server
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
