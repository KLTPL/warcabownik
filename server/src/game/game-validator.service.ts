import { Injectable } from "@nestjs/common";
import { parsePosition, getPiece } from "./board.utils";
import {
  EMPTY_SQUARE,
  WHITE_PIECE,
  WHITE_KING,
  BLACK_KING,
  MOVE_STEP,
  CAPTURE_STEP,
  REGULAR_DIRECTIONS,
  CAPTURE_DIRECTIONS,
  Position,
  MovePayload,
  Direction,
  BOARD_MIN,
  BOARD_MAX,
} from "./game.constants";

@Injectable()
export class GameValidatorService {
  validateMove(
    board: string[][],
    move: MovePayload,
    isWhiteTurn: boolean,
  ): boolean {
    if (!move.fromPosition || !move.toPosition) {
      return false;
    }

    const from: Position = parsePosition(move.fromPosition);
    const to: Position = parsePosition(move.toPosition);

    const piece = getPiece(board, from.x, from.y);
    const target = getPiece(board, to.x, to.y);

    if (!piece || piece === EMPTY_SQUARE || target !== EMPTY_SQUARE) {
      return false;
    }

    const isPieceWhite = piece.toLowerCase() === WHITE_PIECE;
    if (isWhiteTurn !== isPieceWhite) {
      return false;
    }

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const absDx = Math.abs(dx);

    if (absDx !== Math.abs(dy)) {
      return false;
    }

    if (!this.isDirectionValid(piece, isPieceWhite, dy)) {
      return false;
    }

    if (absDx === MOVE_STEP) {
      return !this.hasAnyCaptures(board, isWhiteTurn);
    }

    if (absDx === CAPTURE_STEP) {
      return this.isValidCaptureMove(board, from, dx, dy, isPieceWhite);
    }

    return false;
  }

  hasAdditionalCaptures(board: string[][], x: number, y: number): boolean {
    const piece = getPiece(board, x, y);
    if (!piece || piece === EMPTY_SQUARE) return false;

    const isWhite = piece.toLowerCase() === WHITE_PIECE;

    for (const dir of CAPTURE_DIRECTIONS) {
      if (!this.isDirectionValid(piece, isWhite, dir.dy)) {
        continue;
      }
      if (this.canCaptureInDirection(board, { x, y }, dir, isWhite)) {
        return true;
      }
    }

    return false;
  }

  hasAnyCaptures(board: string[][], isWhiteTurn: boolean): boolean {
    return this.scanBoardForAction(board, isWhiteTurn, (x, y) =>
      this.hasAdditionalCaptures(board, x, y),
    );
  }

  hasAnyLegalMoves(board: string[][], isWhiteTurn: boolean): boolean {
    return this.scanBoardForAction(board, isWhiteTurn, (x, y, piece) => {
      if (this.hasAdditionalCaptures(board, x, y)) {
        return true;
      }
      return this.hasRegularMove(board, { x, y }, piece, isWhiteTurn);
    });
  }

  private isDirectionValid(
    piece: string,
    isWhite: boolean,
    dy: number,
  ): boolean {
    const isKing = piece === WHITE_KING || piece === BLACK_KING;
    if (isKing) return true;
    if (isWhite && dy <= 0) return false;
    if (!isWhite && dy >= 0) return false;

    return true;
  }

  private isValidCaptureMove(
    board: string[][],
    from: Position,
    dx: number,
    dy: number,
    isPieceWhite: boolean,
  ): boolean {
    const midX = from.x + dx / 2;
    const midY = from.y + dy / 2;
    const midPiece = getPiece(board, midX, midY);

    if (!midPiece || midPiece === EMPTY_SQUARE) {
      return false;
    }

    const isMidWhite = midPiece.toLowerCase() === WHITE_PIECE;
    return isPieceWhite !== isMidWhite;
  }

  private canCaptureInDirection(
    board: string[][],
    from: Position,
    dir: Direction,
    isWhite: boolean,
  ): boolean {
    const toX = from.x + dir.dx;
    const toY = from.y + dir.dy;
    const target = getPiece(board, toX, toY);

    if (target !== EMPTY_SQUARE) {
      return false;
    }

    const midX = from.x + dir.dx / 2;
    const midY = from.y + dir.dy / 2;
    const midPiece = getPiece(board, midX, midY);

    if (!midPiece || midPiece === EMPTY_SQUARE) {
      return false;
    }

    const isMidWhite = midPiece.toLowerCase() === WHITE_PIECE;
    return isWhite !== isMidWhite;
  }

  private hasRegularMove(
    board: string[][],
    pos: Position,
    piece: string,
    isWhiteTurn: boolean,
  ): boolean {
    for (const dir of REGULAR_DIRECTIONS) {
      if (!this.isDirectionValid(piece, isWhiteTurn, dir.dy)) {
        continue;
      }
      const toX = pos.x + dir.dx;
      const toY = pos.y + dir.dy;
      if (getPiece(board, toX, toY) === EMPTY_SQUARE) {
        return true;
      }
    }
    return false;
  }

  private scanBoardForAction(
    board: string[][],
    isWhiteTurn: boolean,
    action: (x: number, y: number, piece: string) => boolean,
  ): boolean {
    for (let y = BOARD_MIN; y <= BOARD_MAX; y++) {
      for (let x = BOARD_MIN; x <= BOARD_MAX; x++) {
        const piece = board[y][x];
        if (this.isPlayerPiece(piece, isWhiteTurn)) {
          if (action(x, y, piece)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private isPlayerPiece(
    piece: string | undefined,
    isWhiteTurn: boolean,
  ): boolean {
    if (!piece || piece === EMPTY_SQUARE) {
      return false;
    }
    return (piece.toLowerCase() === WHITE_PIECE) === isWhiteTurn;
  }
}
