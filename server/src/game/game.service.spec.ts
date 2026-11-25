import { GameService } from "./game.service";
import { AiService } from "../ai/ai.service";
import { GameValidatorService } from "./game-validator.service";
import { PrismaService } from "../prisma/prisma.service";
import { GameStatus } from "../../generated/prisma/enums";
import { BOARD_SIZE, EMPTY_SQUARE } from "./game.constants";

describe("GameService.checkAndTriggerAi", () => {
  let service: GameService;
  let prisma: { game: { findUnique: jest.Mock } };
  let processAiTurnsSpy: jest.SpyInstance;

  const emptyBoard = (): string[][] =>
    Array.from({ length: BOARD_SIZE }, () =>
      Array<string>(BOARD_SIZE).fill(EMPTY_SQUARE),
    );

  // A single completed move used to simulate an in-progress game where it's
  // no longer the opening turn. Placing "w"/"b" at c4 after a non-capturing
  // b3->c4 step means `determineIsWhiteTurn` flips to the other color.
  const boardAfterOneMove = (piece: "w" | "b"): string[][] => {
    const board = emptyBoard();
    board[3][2] = piece;
    return board;
  };

  const buildGame = (overrides: {
    whitePlayerId: string | null;
    blackPlayerId: string | null;
    boardStateJson: string;
    moves: unknown[];
  }) => ({
    id: "game-1",
    boardStateJson: overrides.boardStateJson,
    status: GameStatus.IN_PROGRESS,
    winnerId: null,
    whitePlayerId: overrides.whitePlayerId,
    blackPlayerId: overrides.blackPlayerId,
    moves: overrides.moves,
  });

  beforeEach(() => {
    prisma = { game: { findUnique: jest.fn() } };
    service = new GameService(
      prisma as unknown as PrismaService,
      new AiService(),
      new GameValidatorService(),
    );
    processAiTurnsSpy = jest
      .spyOn(
        service as unknown as { processAiTurns: () => Promise<unknown> },
        "processAiTurns",
      )
      .mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("triggers the AI to open as White when the human plays Black on a fresh game", async () => {
    prisma.game.findUnique.mockResolvedValue(
      buildGame({
        whitePlayerId: null,
        blackPlayerId: "human-1",
        boardStateJson: JSON.stringify(emptyBoard()),
        moves: [],
      }),
    );

    await service.checkAndTriggerAi("game-1");

    expect(processAiTurnsSpy).toHaveBeenCalled();
  });

  it("does not trigger the AI on a fresh game when the human plays White", async () => {
    prisma.game.findUnique.mockResolvedValue(
      buildGame({
        whitePlayerId: "human-1",
        blackPlayerId: null,
        boardStateJson: JSON.stringify(emptyBoard()),
        moves: [],
      }),
    );

    await service.checkAndTriggerAi("game-1");

    expect(processAiTurnsSpy).not.toHaveBeenCalled();
  });

  it("triggers the AI to play Black after the human's White move (existing behavior)", async () => {
    prisma.game.findUnique.mockResolvedValue(
      buildGame({
        whitePlayerId: "human-1",
        blackPlayerId: null,
        boardStateJson: JSON.stringify(boardAfterOneMove("w")),
        moves: [
          {
            turnNumber: 1,
            fromPosition: "b3",
            toPosition: "c4",
            playerId: "human-1",
          },
        ],
      }),
    );

    await service.checkAndTriggerAi("game-1");

    expect(processAiTurnsSpy).toHaveBeenCalled();
  });

  it("triggers the AI to play White after the human's Black move", async () => {
    prisma.game.findUnique.mockResolvedValue(
      buildGame({
        whitePlayerId: null,
        blackPlayerId: "human-1",
        boardStateJson: JSON.stringify(boardAfterOneMove("b")),
        moves: [
          {
            turnNumber: 1,
            fromPosition: "b3",
            toPosition: "c4",
            playerId: "human-1",
          },
        ],
      }),
    );

    await service.checkAndTriggerAi("game-1");

    expect(processAiTurnsSpy).toHaveBeenCalled();
  });

  it("never triggers the AI in a human-vs-human game", async () => {
    prisma.game.findUnique.mockResolvedValue(
      buildGame({
        whitePlayerId: "human-1",
        blackPlayerId: "human-2",
        boardStateJson: JSON.stringify(emptyBoard()),
        moves: [],
      }),
    );

    await service.checkAndTriggerAi("game-1");

    expect(processAiTurnsSpy).not.toHaveBeenCalled();
  });
});
