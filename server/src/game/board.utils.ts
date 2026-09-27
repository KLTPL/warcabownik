import { ASCII_A, BOARD_MIN, BOARD_MAX, Position } from "./game.constants";

// functions for board evaluation
export function parsePosition(pos: string): Position {
  return {
    x: pos.toLowerCase().charCodeAt(0) - ASCII_A,
    y: parseInt(pos.slice(1)) - 1,
  };
}

export function getPiece(
  board: string[][],
  x: number,
  y: number,
): string | null {
  // parsePosition yields NaN for a malformed position, and NaN passes every
  // `<` / `>` bounds check below, so reject non-squares before indexing.
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    return null;
  }
  if (y < BOARD_MIN || y > BOARD_MAX || x < BOARD_MIN || x > BOARD_MAX) {
    return null;
  }
  return board[y][x];
}
