# Warcabownik server

## ⚙️ Project setup

### Running localy

1. Create .env

   ```
   # For prisma
   DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/nestjs_db?schema=public"

   # For docker
   POSTGRES_USER="myuser"
   POSTGRES_PASSWORD="mypassword"
   POSTGRES_DB="nestjs_db"
   AI_URL=http://localhost:5000


   # JWT
   JWT_SECRET=
   EXPIRY_TIME_MS=
   ```

2. Turn on docker database

   ```
   sudo docker-compose up -d
   ```

3. Download packages

   ```
   pnpm install
   ```

4. Generate prisma

   ```
   pnpm prisma generate
   ```

5. Run the dev command

   ```
   pnpm dev:start
   ```

#### To seed the database run

```
pnpm prisma db seed
```

## 🔌 WebSocket API

**Namespace:** `/game`

### Events Sent by Client (Frontend -> Backend)

#### `joinGame`

Subscribes the player's socket to a specific game room to receive updates for that match.

- **Payload:**

  ```json
  { "gameId": "string" }
  ```

#### `sendPlayerMove`

Submits a move made by the player.

- **Payload:**

  ```json
  {
    "gameId": "string",
    "from": { "y": "number", "x": "number" },
    "to": { "y": "number", "x": "number" }
  }
  ```

### Events Received by Client (Backend -> Frontend)

#### `gameStateUpdate`

Broadcasted by the server to all clients in the game room after a turn is processed (including the AI bot's response).

- **Payload:**

  ```json
  {
    "gameId": "string",
    "status": "IN_PROGRESS | FINISHED",
    "lastMoveByPlayer": { ... },
    "botMove": { ... },
    "message": "string"
  }
  ```
