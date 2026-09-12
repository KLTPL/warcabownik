export const ASCII_A = 97;
export const BOARD_MIN = 0;
export const BOARD_MAX = 7;
export const EMPTY_SQUARE = "";
export const WHITE_PIECE = "w";
export const BLACK_PIECE = "b";
export const WHITE_KING = "W";
export const BLACK_KING = "B";
export const MOVE_STEP = 1;
export const CAPTURE_STEP = 2;

export interface Position {
  x: number;
  y: number;
}

export interface MovePayload {
  fromPosition: string;
  toPosition: string;
}

export interface Direction {
  dx: number;
  dy: number;
}

export const REGULAR_DIRECTIONS: Direction[] = [
  { dx: -1, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },
  { dx: 1, dy: 1 },
];

export const CAPTURE_DIRECTIONS: Direction[] = [
  { dx: -2, dy: -2 },
  { dx: 2, dy: -2 },
  { dx: -2, dy: 2 },
  { dx: 2, dy: 2 },
];

export const BOARD_SIZE = 8;
export const INITIAL_WHITE_ROWS = 3;
export const INITIAL_BLACK_ROW_START = 5;
export const DEFAULT_WHITE_ID = "WHITE";
export const DEFAULT_BLACK_ID = "BLACK";
export const CORS_ORIGIN = "http://localhost:5173";

export const SocketEvents = {
  JOIN_GAME: "joinGame",
  SEND_PLAYER_MOVE: "sendPlayerMove",
  GAME_STATE_UPDATE: "gameStateUpdate",
  MOVE_ERROR: "moveError",
} as const;

export const SocketStatus = {
  SUCCESS: "success",
  ERROR: "error",
} as const;
