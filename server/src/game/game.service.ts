import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { GameValidatorService } from "./game-validator.service";
import { GameStatus } from "../../generated/prisma/enums";
import { parsePosition } from "./board.utils";
import {
  BOARD_SIZE,
  BOARD_MIN,
  BOARD_MAX,
  INITIAL_WHITE_ROWS,
  INITIAL_BLACK_ROW_START,
  WHITE_PIECE,
  BLACK_PIECE,
  EMPTY_SQUARE,
  CAPTURE_STEP,
  MovePayload,
  DEFAULT_WHITE_ID,
  DEFAULT_BLACK_ID,
} from "./game.constants";

export interface GameState {
  id: string;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  boardStateJson: string;
  status: GameStatus;
  winnerId: string | null;
}

export interface GameWithMoves extends GameState {
  moves: unknown[];
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly gameValidator: GameValidatorService,
  ) {}

  getInitialBoard(): string[][] {
    const board: string[][] = Array.from({ length: BOARD_SIZE }, () =>
      Array<string>(BOARD_SIZE).fill(EMPTY_SQUARE),
    );

    for (let y = BOARD_MIN; y < INITIAL_WHITE_ROWS; y++) {
      for (let x = BOARD_MIN; x <= BOARD_MAX; x++) {
        if ((x + y) % 2 === 1) board[y][x] = WHITE_PIECE;
      }
    }

    for (let y = INITIAL_BLACK_ROW_START; y <= BOARD_MAX; y++) {
      for (let x = BOARD_MIN; x <= BOARD_MAX; x++) {
        if ((x + y) % 2 === 1) board[y][x] = BLACK_PIECE;
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

  async playTurn(gameId: string, userId: string, move: MovePayload) {
    this.logger.log(`Processing player turn for game: ${gameId}`);

    const playerResult = await this.applyMove(gameId, userId, move);

    if (
      playerResult.canContinueCapture ||
      playerResult.game.status === GameStatus.FINISHED
    ) {
      return playerResult.game;
    }

    try {
      return await this.processAiTurns(gameId, playerResult.game);
    } catch (error) {
      this.logger.error(
        `AI failed to respond. Keeping board state after player move.`,
      );
      return playerResult.game;
    }
  }

  private determineIsWhiteTurn(
    game: GameWithMoves,
    boardState: string[][],
  ): boolean {
    if (game.moves.length === 0) {
      return true;
    }
    const lastMove = game.moves[game.moves.length - 1] as {
      fromPosition: string;
      toPosition: string;
    };
    const lastFrom = parsePosition(lastMove.fromPosition);
    const lastTo = parsePosition(lastMove.toPosition);

    const piece = boardState[lastTo.y][lastTo.x];
    if (!piece) {
      return (game.moves.length + 1) % 2 !== 0;
    }
    const isLastPieceWhite = piece.toLowerCase() === WHITE_PIECE;
    const wasCapture = Math.abs(lastTo.x - lastFrom.x) === CAPTURE_STEP;
    const canContinue =
      wasCapture &&
      this.gameValidator.hasAdditionalCaptures(boardState, lastTo.x, lastTo.y);

    if (canContinue) {
      return isLastPieceWhite;
    }
    return !isLastPieceWhite;
  }

  async applyMove(gameId: string, playerId: string | null, move: MovePayload) {
    const game = await this.getValidGame(gameId);

    const parsedJson: unknown = JSON.parse(game.boardStateJson);
    const boardState = parsedJson as string[][];

    const currentTurnNumber = game.moves.length + 1;
    const isWhiteTurn = this.determineIsWhiteTurn(game, boardState);

    this.verifyPlayerTurn(game, playerId, isWhiteTurn);

    this.logger.debug(
      `Validating move: ${move.fromPosition} -> ${move.toPosition} | isWhiteTurn: ${isWhiteTurn}`,
    );
    if (!this.gameValidator.validateMove(boardState, move, isWhiteTurn)) {
      throw new BadRequestException("InvalidMove");
    }

    const { newBoard, captured, promoted, toX, toY } = this.updateBoardState(
      boardState,
      move,
    );

    const canContinueCapture =
      captured &&
      !promoted &&
      this.gameValidator.hasAdditionalCaptures(newBoard, toX, toY);

    const nextTurnIsWhite = canContinueCapture ? isWhiteTurn : !isWhiteTurn;

    const { status, winnerId } = this.determineGameStatus(
      newBoard,
      nextTurnIsWhite,
      isWhiteTurn,
      game,
    );

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
            playerId: playerId ?? undefined,
          },
        },
      },
    });

    return { game: updatedGame as GameState, canContinueCapture };
  }

  private async getValidGame(gameId: string): Promise<GameWithMoves> {
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

    return game;
  }

  private verifyPlayerTurn(
    game: GameState,
    playerId: string | null,
    isWhiteTurn: boolean,
  ): void {
    if (playerId === null) return;

    const expectedPlayerId = isWhiteTurn
      ? game.whitePlayerId
      : game.blackPlayerId;
    if (expectedPlayerId && playerId !== expectedPlayerId) {
      throw new BadRequestException("NotYourTurn");
    }
  }

  private determineGameStatus(
    newBoard: string[][],
    nextTurnIsWhite: boolean,
    isWhiteTurn: boolean,
    game: GameState,
  ): { status: GameStatus; winnerId: string | null } {
    let status: GameStatus = game.status;
    let winnerId: string | null = game.winnerId;

    const opponentHasMoves = this.gameValidator.hasAnyLegalMoves(
      newBoard,
      nextTurnIsWhite,
    );

    if (!opponentHasMoves) {
      status = GameStatus.FINISHED;
      winnerId = isWhiteTurn
        ? game.whitePlayerId || DEFAULT_WHITE_ID
        : game.blackPlayerId || DEFAULT_BLACK_ID;
    }

    return { status, winnerId };
  }

  private async processAiTurns(
    gameId: string,
    initialGame: GameState,
  ): Promise<GameState> {
    let currentBoardJson = initialGame.boardStateJson;
    let finalGame = initialGame;
    let aiCanContinue = true;

    while (aiCanContinue && finalGame.status === GameStatus.IN_PROGRESS) {
      const aiMoveData = await this.aiService.getAiMove(currentBoardJson);
      const aiMove: MovePayload = {
        fromPosition: aiMoveData.fromPosition,
        toPosition: aiMoveData.toPosition,
      };

      this.logger.log(`Processing AI move for game: ${gameId}`);

      const aiResult = await this.applyMove(gameId, null, aiMove);
      finalGame = aiResult.game;
      currentBoardJson = finalGame.boardStateJson;
      aiCanContinue = aiResult.canContinueCapture;
    }

    return finalGame;
  }

  private updateBoardState(board: string[][], move: MovePayload) {
    const newBoard = board.map((row) => [...row]);
    const from = parsePosition(move.fromPosition);
    const to = parsePosition(move.toPosition);

    let piece = newBoard[from.y][from.x];
    newBoard[from.y][from.x] = EMPTY_SQUARE;

    const promoted = this.checkPromotion(piece, to.y);
    if (promoted) {
      piece = piece.toUpperCase();
    }

    newBoard[to.y][to.x] = piece;
    const captured = this.processPotentialCapture(newBoard, from, to);

    return { newBoard, captured, promoted, toX: to.x, toY: to.y };
  }

  private checkPromotion(piece: string, toY: number): boolean {
    const isWhite = piece.toLowerCase() === WHITE_PIECE;
    const isPawn = piece === WHITE_PIECE || piece === BLACK_PIECE;

    if (!isPawn) return false;
    return (isWhite && toY === BOARD_MAX) || (!isWhite && toY === BOARD_MIN);
  }

  private processPotentialCapture(
    board: string[][],
    from: { x: number; y: number },
    to: { x: number; y: number },
  ): boolean {
    if (Math.abs(to.x - from.x) !== CAPTURE_STEP) {
      return false;
    }

    const midX = from.x + (to.x - from.x) / 2;
    const midY = from.y + (to.y - from.y) / 2;
    board[midY][midX] = EMPTY_SQUARE;

    return true;
  }

  async getUserHistory(userId: string, page: number = 1, limit: number = 5) {
    const skip = (page - 1) * limit;

    const [games, total] = await Promise.all([
      this.prisma.game.findMany({
        where: { OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }] },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.game.count({
        where: { OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }] },
      }),
    ]);

    return { games, total, page, totalPages: Math.ceil(total / limit) };
  }
}
