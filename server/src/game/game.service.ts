import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { GameValidatorService } from "./game-validator.service";
import { GameStatus } from "../../generated/prisma/enums";

@Injectable()
export class GameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly gameValidator: GameValidatorService,
  ) {}

  getInitialBoard(): string[][] {
    const board: string[][] = Array(8)
      .fill(null)
      .map(() => Array(8).fill(""));

    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 8; x++) {
        if ((x + y) % 2 === 1) {
          board[y][x] = "w";
        }
      }
    }

    for (let y = 5; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if ((x + y) % 2 === 1) {
          board[y][x] = "b";
        }
      }
    }

    return board;
  }

  async createGame(whitePlayerId?: string, blackPlayerId?: string) {
    const initialBoard = this.getInitialBoard();

    return await this.prisma.game.create({
      data: {
        whitePlayerId,
        blackPlayerId,
        boardStateJson: JSON.stringify(initialBoard),
      },
    });
  }

  async applyMove(
    gameId: string,
    playerId: string | null,
    move: { fromPosition: string; toPosition: string },
  ) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { moves: true },
    });

    if (!game) {
      throw new BadRequestException("GameNotFound");
    }

    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException("GameAlreadyFinished");
    }

    const currentTurnNumber = game.moves.length + 1;
    const isWhiteTurn = currentTurnNumber % 2 !== 0;

    if (playerId !== null) {
      const expectedPlayerId = isWhiteTurn
        ? game.whitePlayerId
        : game.blackPlayerId;
      if (expectedPlayerId && playerId !== expectedPlayerId) {
        throw new BadRequestException("NotYourTurn");
      }
    }

    const boardState: string[][] = JSON.parse(game.boardStateJson);

    const isValid = this.gameValidator.validateMove(
      boardState,
      move,
      isWhiteTurn,
    );
    if (!isValid) {
      throw new BadRequestException("InvalidMove");
    }

    const { newBoard, captured, promoted, toX, toY } =
      this.gameValidator.updateBoardState(boardState, move);

    const canContinueCapture =
      captured &&
      !promoted &&
      this.gameValidator.hasAdditionalCaptures(newBoard, toX, toY);

    let status: GameStatus = game.status;
    let winnerId: string | null = game.winnerId;

    const nextTurnIsWhite = canContinueCapture ? isWhiteTurn : !isWhiteTurn;
    const opponentHasMoves = this.gameValidator.hasAnyLegalMoves(
      newBoard,
      nextTurnIsWhite,
    );

    if (!opponentHasMoves) {
      status = GameStatus.FINISHED;
      winnerId = isWhiteTurn
        ? game.whitePlayerId || "WHITE"
        : game.blackPlayerId || "BLACK";
    }

    const updatedGame = await this.prisma.game.update({
      where: { id: gameId },
      data: {
        boardStateJson: JSON.stringify(newBoard),
        status,
        winnerId,
        moves: {
          create: {
            turnNumber: currentTurnNumber,
            fromPosition: move.fromPosition,
            toPosition: move.toPosition,
            playerId: playerId,
          },
        },
      },
    });

    return { game: updatedGame, canContinueCapture };
  }

  async playTurn(
    gameId: string,
    userId: string,
    move: { fromPosition: string; toPosition: string },
  ) {
    const playerResult = await this.applyMove(gameId, userId, move);

    if (
      playerResult.canContinueCapture ||
      playerResult.game.status === GameStatus.FINISHED
    ) {
      return playerResult.game;
    }

    let currentBoardJson = playerResult.game.boardStateJson;
    let finalGame = playerResult.game;
    let aiCanContinue = true;

    while (aiCanContinue && finalGame.status === GameStatus.IN_PROGRESS) {
      const aiMoveData = await this.aiService.getAiMove(currentBoardJson);
      const aiMove = {
        fromPosition: aiMoveData.fromPosition,
        toPosition: aiMoveData.toPosition,
      };

      const aiResult = await this.applyMove(gameId, null, aiMove);
      finalGame = aiResult.game;
      currentBoardJson = finalGame.boardStateJson;
      aiCanContinue = aiResult.canContinueCapture;
    }

    return finalGame;
  }
}
