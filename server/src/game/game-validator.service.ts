import { Injectable } from "@nestjs/common";

@Injectable()
export class GameValidatorService {
  parsePosition(pos: string) {
    return {
      x: pos.toLowerCase().charCodeAt(0) - 97,
      y: parseInt(pos.slice(1)) - 1,
    };
  }

  getPiece(board: string[][], x: number, y: number): string | null {
    if (y < 0 || y > 7 || x < 0 || x > 7) {
      return null;
    }
    return board[y][x];
  }

  validateMove(
    board: string[][],
    move: { fromPosition: string; toPosition: string },
    isWhiteTurn: boolean,
  ): boolean {
    if (!move.fromPosition || !move.toPosition) {
      return false;
    }

    const from = this.parsePosition(move.fromPosition);
    const to = this.parsePosition(move.toPosition);

    const piece = this.getPiece(board, from.x, from.y);
    const target = this.getPiece(board, to.x, to.y);
    console.log(JSON.stringify(piece), JSON.stringify(target));
    if (!piece || piece === "" || target !== "") {
      return false;
    }

    const isPieceWhite = piece.toLowerCase() === "w";
    if (isWhiteTurn !== isPieceWhite) {
      return false;
    }

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx !== absDy) {
      return false;
    }

    const isKing = piece === "W" || piece === "B";

    if (!isKing) {
      if (isPieceWhite && dy <= 0) return false;
      if (!isPieceWhite && dy >= 0) return false;
    }

    if (absDx === 1) {
      const capturesAvailable = this.hasAnyCaptures(board, isWhiteTurn);
      if (capturesAvailable) {
        return false;
      }
      return true;
    }

    if (absDx === 2) {
      const midX = from.x + dx / 2;
      const midY = from.y + dy / 2;
      const midPiece = this.getPiece(board, midX, midY);

      if (!midPiece || midPiece === "") {
        return false;
      }

      const isMidWhite = midPiece.toLowerCase() === "w";
      if (isPieceWhite === isMidWhite) {
        return false;
      }

      return true;
    }

    return false;
  }

  updateBoardState(
    board: string[][],
    move: { fromPosition: string; toPosition: string },
  ): {
    newBoard: string[][];
    captured: boolean;
    promoted: boolean;
    toX: number;
    toY: number;
  } {
    const newBoard = board.map((row) => [...row]);

    const from = this.parsePosition(move.fromPosition);
    const to = this.parsePosition(move.toPosition);

    let piece = newBoard[from.y][from.x];
    newBoard[from.y][from.x] = "";

    let promoted = false;
    const isWhite = piece.toLowerCase() === "w";
    if (piece === "w" || piece === "b") {
      if ((isWhite && to.y === 7) || (!isWhite && to.y === 0)) {
        piece = piece.toUpperCase();
        promoted = true;
      }
    }

    newBoard[to.y][to.x] = piece;

    let captured = false;
    if (Math.abs(to.x - from.x) === 2) {
      const midX = from.x + (to.x - from.x) / 2;
      const midY = from.y + (to.y - from.y) / 2;
      newBoard[midY][midX] = "";
      captured = true;
    }

    return { newBoard, captured, promoted, toX: to.x, toY: to.y };
  }

  hasAdditionalCaptures(board: string[][], x: number, y: number): boolean {
    const piece = this.getPiece(board, x, y);
    if (!piece || piece === "") return false;

    const isWhite = piece.toLowerCase() === "w";
    const isKing = piece === "W" || piece === "B";
    const directions = [
      { dx: -2, dy: -2 },
      { dx: 2, dy: -2 },
      { dx: -2, dy: 2 },
      { dx: 2, dy: 2 },
    ];

    for (const dir of directions) {
      if (!isKing) {
        if (isWhite && dir.dy <= 0) continue;
        if (!isWhite && dir.dy >= 0) continue;
      }

      const toX = x + dir.dx;
      const toY = y + dir.dy;
      const target = this.getPiece(board, toX, toY);

      if (target === "") {
        const midX = x + dir.dx / 2;
        const midY = y + dir.dy / 2;
        const midPiece = this.getPiece(board, midX, midY);
        if (midPiece && midPiece !== "") {
          const isMidWhite = midPiece.toLowerCase() === "w";
          if (isWhite !== isMidWhite) {
            return true;
          }
        }
      }
    }

    return false;
  }

  hasAnyCaptures(board: string[][], isWhiteTurn: boolean): boolean {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && (piece.toLowerCase() === "w") === isWhiteTurn) {
          if (this.hasAdditionalCaptures(board, x, y)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  hasAnyLegalMoves(board: string[][], isWhiteTurn: boolean): boolean {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && (piece.toLowerCase() === "w") === isWhiteTurn) {
          if (this.hasAdditionalCaptures(board, x, y)) return true;

          const isKing = piece === "W" || piece === "B";
          const directions = [
            { dx: -1, dy: -1 },
            { dx: 1, dy: -1 },
            { dx: -1, dy: 1 },
            { dx: 1, dy: 1 },
          ];

          for (const dir of directions) {
            if (!isKing) {
              if (isWhiteTurn && dir.dy <= 0) continue;
              if (!isWhiteTurn && dir.dy >= 0) continue;
            }
            const toX = x + dir.dx;
            const toY = y + dir.dy;
            if (this.getPiece(board, toX, toY) === "") {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
}
