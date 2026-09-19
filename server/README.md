# Warcabownik server

### To seed the database run

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
