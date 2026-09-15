export type GameStatus = "IN_PROGRESS" | "FINISHED" | "DRAW" | "ABANDONED";

export enum SocketEvents {
  JOIN_GAME = "JOIN_GAME",
  SEND_PLAYER_MOVE = "SEND_PLAYER_MOVE",
  GAME_STATE_UPDATE = "GAME_STATE_UPDATE",
  MOVE_ERROR = "MOVE_ERROR",
}

export enum SocketStatus {
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

// Core Game Types
export interface MovePayload {
  fromPosition: string;
  toPosition: string;
}

export interface GameState {
  id: string;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  boardStateJson: string;
  status: GameStatus;
  winnerId: string | null;
}
