import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class GameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async applyMove(gameId: string, playerId: string | null, move: { fromPosition: string; toPosition: string }) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { moves: true },
    });

    if (!game) {
      throw new BadRequestException('GameNotFound');
    }

    const boardState = JSON.parse(game.boardStateJson);

    const isValid = this.validateMove(boardState, move);
    if (!isValid) {
      throw new BadRequestException('InvalidMove');
    }

    const newBoardState = this.updateBoardState(boardState, move);
    const nextTurnNumber = game.moves.length + 1;

    const updatedGame = await this.prisma.game.update({
      where: { id: gameId },
      data: {
        boardStateJson: JSON.stringify(newBoardState),
        moves: {
          create: {
            turnNumber: nextTurnNumber,
            fromPosition: move.fromPosition,
            toPosition: move.toPosition,
            playerId: playerId,
          },
        },
      },
    });

    return updatedGame;
  }

  async playTurn(gameId: string, userId: string, move: { fromPosition: string; toPosition: string }) {
    const playerResult = await this.applyMove(gameId, userId, move);

    const aiMoveData = await this.aiService.getAiMove(playerResult.boardStateJson);
    const aiMove = {
      fromPosition: aiMoveData.fromPosition,
      toPosition: aiMoveData.toPosition,
    };

    return await this.applyMove(gameId, null, aiMove);
  }

  private parsePosition(pos: string) {
    return {
      x: pos.toLowerCase().charCodeAt(0) - 97,
      y: parseInt(pos.slice(1)) - 1,
    };
  }

  private getPiece(board: string[][], x: number, y: number): string | null {
    if (y < 0 || y > 7 || x < 0 || x > 7) {
      return null;
    }
    return board[y][x];
  }

  private validateMove(board: string[][], move: { fromPosition: string; toPosition: string }): boolean {
    if (!move.fromPosition || !move.toPosition) {
      return false;
    }

    const from = this.parsePosition(move.fromPosition);
    const to = this.parsePosition(move.toPosition);

    const piece = this.getPiece(board, from.x, from.y);
    const target = this.getPiece(board, to.x, to.y);

    if (!piece || piece === '' || target !== '') {
      return false;
    }

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx !== absDy) {
      return false;
    }

    const isWhite = piece.toLowerCase() === 'w';
    const isKing = piece === 'W' || piece === 'B';

    if (!isKing) {
      if (isWhite && dy <= 0) return false;
      if (!isWhite && dy >= 0) return false;
    }

    if (absDx === 1) {
      return true;
    }

    if (absDx === 2) {
      const midX = from.x + dx / 2;
      const midY = from.y + dy / 2;
      const midPiece = this.getPiece(board, midX, midY);

      if (!midPiece || midPiece === '') {
        return false;
      }

      const isMidWhite = midPiece.toLowerCase() === 'w';
      if (isWhite === isMidWhite) {
        return false;
      }

      return true;
    }

    return false;
  }

  private updateBoardState(board: string[][], move: { fromPosition: string; toPosition: string }): string[][] {
    const newBoard = board.map(row => [...row]);
    
    const from = this.parsePosition(move.fromPosition);
    const to = this.parsePosition(move.toPosition);

    let piece = newBoard[from.y][from.x];
    newBoard[from.y][from.x] = '';

    const isWhite = piece.toLowerCase() === 'w';
    if ((isWhite && to.y === 7) || (!isWhite && to.y === 0)) {
      piece = piece.toUpperCase();
    }

    newBoard[to.y][to.x] = piece;

    if (Math.abs(to.x - from.x) === 2) {
      const midX = from.x + (to.x - from.x) / 2;
      const midY = from.y + (to.y - from.y) / 2;
      newBoard[midY][midX] = '';
    }

    return newBoard;
  }
}