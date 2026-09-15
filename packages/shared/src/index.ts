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

// Socket.io Acknowledgement Responses
export type PlayerMoveResponse =
  | { status: SocketStatus.SUCCESS; game: GameState }
  | { status: SocketStatus.ERROR; message: string };

// Events emitted by the NestJS Server, listened to by the React Client
export interface ServerToClientEvents {
  [SocketEvents.GAME_STATE_UPDATE]: (game: GameState) => void;
  [SocketEvents.MOVE_ERROR]: (error: { message: string }) => void;
}

// Events emitted by the React Client, listened to by the NestJS Server
export interface ClientToServerEvents {
  [SocketEvents.JOIN_GAME]: (payload: { gameId: string }) => void;
  [SocketEvents.SEND_PLAYER_MOVE]: (
    payload: { gameId: string; move: MovePayload },
    callback: (response: PlayerMoveResponse) => void,
  ) => void;
}
