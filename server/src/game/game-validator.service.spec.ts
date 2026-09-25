import { Test, TestingModule } from "@nestjs/testing";
import { MovePayload } from "@warcabownik/shared";
import { GameValidatorService } from "./game-validator.service";
import { parsePosition } from "./board.utils";
import {
  BLACK_KING,
  BLACK_PIECE,
  BOARD_SIZE,
  EMPTY_SQUARE,
  WHITE_KING,
  WHITE_PIECE,
} from "./game.constants";

const WHITE_TURN = true;
const BLACK_TURN = false;

const emptyBoard = (): string[][] =>
  Array.from({ length: BOARD_SIZE }, () =>
    Array<string>(BOARD_SIZE).fill(EMPTY_SQUARE),
  );

/** Builds a board from algebraic squares, e.g. { e4: "w", d5: "b" }. */
const boardWith = (pieces: Record<string, string>): string[][] => {
  const board = emptyBoard();
  for (const [square, piece] of Object.entries(pieces)) {
    const { x, y } = parsePosition(square);
    board[y][x] = piece;
  }
  return board;
};

const move = (fromPosition: string, toPosition: string): MovePayload => ({
  fromPosition,
  toPosition,
});

const squareOf = (algebraic: string): [number, number] => {
  const { x, y } = parsePosition(algebraic);
  return [x, y];
};

describe("GameValidatorService", () => {
  let validator: GameValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameValidatorService],
    }).compile();

    validator = module.get(GameValidatorService);
  });

  describe("validateMove — quiet moves", () => {
    it("lets a white man step diagonally up the board", () => {
      const board = boardWith({ e4: WHITE_PIECE });

      expect(validator.validateMove(board, move("e4", "d5"), WHITE_TURN)).toBe(
        true,
      );
      expect(validator.validateMove(board, move("e4", "f5"), WHITE_TURN)).toBe(
        true,
      );
    });

    it("lets a black man step diagonally down the board", () => {
      const board = boardWith({ e4: BLACK_PIECE });

      expect(validator.validateMove(board, move("e4", "d3"), BLACK_TURN)).toBe(
        true,
      );
    });

    it("refuses to let a man walk backwards", () => {
      expect(
        validator.validateMove(
          boardWith({ e4: WHITE_PIECE }),
          move("e4", "d3"),
          WHITE_TURN,
        ),
      ).toBe(false);

      expect(
        validator.validateMove(
          boardWith({ e4: BLACK_PIECE }),
          move("e4", "d5"),
          BLACK_TURN,
        ),
      ).toBe(false);
    });

    it("lets a king step backwards", () => {
      expect(
        validator.validateMove(
          boardWith({ e4: WHITE_KING }),
          move("e4", "d3"),
          WHITE_TURN,
        ),
      ).toBe(true);

      expect(
        validator.validateMove(
          boardWith({ e4: BLACK_KING }),
          move("e4", "d5"),
          BLACK_TURN,
        ),
      ).toBe(true);
    });

    it("refuses a move onto an occupied square", () => {
      const board = boardWith({ e4: WHITE_PIECE, d5: WHITE_PIECE });

      expect(validator.validateMove(board, move("e4", "d5"), WHITE_TURN)).toBe(
        false,
      );
    });

    it("refuses a move that is not diagonal", () => {
      const board = boardWith({ e4: WHITE_PIECE });

      expect(validator.validateMove(board, move("e4", "e5"), WHITE_TURN)).toBe(
        false,
      );
      expect(validator.validateMove(board, move("e4", "d4"), WHITE_TURN)).toBe(
        false,
      );
    });

    it("refuses a diagonal slide of more than one square", () => {
      const board = boardWith({ e4: WHITE_PIECE });

      expect(validator.validateMove(board, move("e4", "b7"), WHITE_TURN)).toBe(
        false,
      );
    });

    it("refuses to move the opponent's piece", () => {
      const board = boardWith({ e4: WHITE_PIECE });

      expect(validator.validateMove(board, move("e4", "d3"), BLACK_TURN)).toBe(
        false,
      );
    });

    it("refuses to move from an empty square", () => {
      expect(
        validator.validateMove(emptyBoard(), move("e4", "d5"), WHITE_TURN),
      ).toBe(false);
    });

    it("refuses a move that would leave the board", () => {
      const board = boardWith({ h7: WHITE_PIECE });

      expect(validator.validateMove(board, move("h7", "i8"), WHITE_TURN)).toBe(
        false,
      );
    });

    it("refuses a move with a missing position", () => {
      const board = boardWith({ e4: WHITE_PIECE });

      expect(validator.validateMove(board, move("", "d5"), WHITE_TURN)).toBe(
        false,
      );
      expect(validator.validateMove(board, move("e4", ""), WHITE_TURN)).toBe(
        false,
      );
    });

    // Socket payloads are not run through a validation pipe, so a client can
    // send any string it likes here. "e" is the nastier case of the two: it
    // parses to an in-range file with a NaN rank.
    it.each(["zz", "e", "a0", "e9", "4e"])(
      "rejects the malformed position %p instead of throwing",
      (malformed) => {
        const board = boardWith({ e4: WHITE_PIECE });

        expect(() =>
          validator.validateMove(board, move(malformed, "d5"), WHITE_TURN),
        ).not.toThrow();
        expect(
          validator.validateMove(board, move(malformed, "d5"), WHITE_TURN),
        ).toBe(false);
        expect(
          validator.validateMove(board, move("e4", malformed), WHITE_TURN),
        ).toBe(false);
      },
    );
  });

  describe("validateMove — captures", () => {
    it("accepts a jump over an enemy piece onto an empty square", () => {
      const board = boardWith({ e4: WHITE_PIECE, d5: BLACK_PIECE });

      expect(validator.validateMove(board, move("e4", "c6"), WHITE_TURN)).toBe(
        true,
      );
    });

    it("refuses a jump over one's own piece", () => {
      const board = boardWith({ e4: WHITE_PIECE, d5: WHITE_PIECE });

      expect(validator.validateMove(board, move("e4", "c6"), WHITE_TURN)).toBe(
        false,
      );
    });

    it("refuses a jump over an empty square", () => {
      const board = boardWith({ e4: WHITE_PIECE });

      expect(validator.validateMove(board, move("e4", "c6"), WHITE_TURN)).toBe(
        false,
      );
    });

    it("refuses a jump onto an occupied square", () => {
      const board = boardWith({
        e4: WHITE_PIECE,
        d5: BLACK_PIECE,
        c6: BLACK_PIECE,
      });

      expect(validator.validateMove(board, move("e4", "c6"), WHITE_TURN)).toBe(
        false,
      );
    });

    it("refuses a backwards jump by a man but allows one by a king", () => {
      const menBoard = boardWith({ e4: WHITE_PIECE, d3: BLACK_PIECE });
      const kingBoard = boardWith({ e4: WHITE_KING, d3: BLACK_PIECE });

      expect(
        validator.validateMove(menBoard, move("e4", "c2"), WHITE_TURN),
      ).toBe(false);
      expect(
        validator.validateMove(kingBoard, move("e4", "c2"), WHITE_TURN),
      ).toBe(true);
    });
  });

  describe("validateMove — capturing is mandatory", () => {
    // The e4 man can take on d5; the a2 man is free to stroll to b3.
    const boardWithAvailableCapture = () =>
      boardWith({ e4: WHITE_PIECE, d5: BLACK_PIECE, a2: WHITE_PIECE });

    it("refuses a quiet move by another piece while a capture is available", () => {
      expect(
        validator.validateMove(
          boardWithAvailableCapture(),
          move("a2", "b3"),
          WHITE_TURN,
        ),
      ).toBe(false);
    });

    it("still allows the capture itself", () => {
      expect(
        validator.validateMove(
          boardWithAvailableCapture(),
          move("e4", "c6"),
          WHITE_TURN,
        ),
      ).toBe(true);
    });

    it("allows the same quiet move once no capture is on offer", () => {
      const board = boardWith({ e4: WHITE_PIECE, a2: WHITE_PIECE });

      expect(validator.validateMove(board, move("a2", "b3"), WHITE_TURN)).toBe(
        true,
      );
    });
  });

  describe("hasAdditionalCaptures", () => {
    it("reports a follow-up jump after landing", () => {
      const board = boardWith({ c6: WHITE_PIECE, d7: BLACK_PIECE });

      expect(validator.hasAdditionalCaptures(board, ...squareOf("c6"))).toBe(
        true,
      );
    });

    it("reports none when the landing square is occupied", () => {
      const board = boardWith({
        c6: WHITE_PIECE,
        d7: BLACK_PIECE,
        e8: WHITE_PIECE,
      });

      expect(validator.hasAdditionalCaptures(board, ...squareOf("c6"))).toBe(
        false,
      );
    });

    it("reports none for an empty square", () => {
      expect(
        validator.hasAdditionalCaptures(emptyBoard(), ...squareOf("c6")),
      ).toBe(false);
    });

    it("does not let a man chain backwards, but lets a king do so", () => {
      const menBoard = boardWith({ e4: WHITE_PIECE, d3: BLACK_PIECE });
      const kingBoard = boardWith({ e4: WHITE_KING, d3: BLACK_PIECE });

      expect(validator.hasAdditionalCaptures(menBoard, ...squareOf("e4"))).toBe(
        false,
      );
      expect(
        validator.hasAdditionalCaptures(kingBoard, ...squareOf("e4")),
      ).toBe(true);
    });
  });

  describe("hasAnyCaptures", () => {
    it("is false when the two sides are not in contact", () => {
      const board = boardWith({ a2: WHITE_PIECE, h7: BLACK_PIECE });

      expect(validator.hasAnyCaptures(board, WHITE_TURN)).toBe(false);
      expect(validator.hasAnyCaptures(board, BLACK_TURN)).toBe(false);
    });

    it("is true when any piece of the side to move can take", () => {
      const board = boardWith({
        a2: WHITE_PIECE,
        e4: WHITE_PIECE,
        d5: BLACK_PIECE,
      });

      expect(validator.hasAnyCaptures(board, WHITE_TURN)).toBe(true);
    });

    it("ignores captures that belong to the other side", () => {
      // Black could take on e4 by jumping to f3; white cannot take at all
      // because c6, its only landing square, is occupied by a friend.
      const board = boardWith({
        e4: WHITE_PIECE,
        d5: BLACK_PIECE,
        c6: WHITE_PIECE,
      });

      expect(validator.hasAnyCaptures(board, WHITE_TURN)).toBe(false);
      expect(validator.hasAnyCaptures(board, BLACK_TURN)).toBe(true);
    });
  });

  describe("hasAnyLegalMoves", () => {
    it("is true for a side with a free man", () => {
      const board = boardWith({ e4: WHITE_PIECE });

      expect(validator.hasAnyLegalMoves(board, WHITE_TURN)).toBe(true);
    });

    it("is false for a side with no pieces left", () => {
      expect(validator.hasAnyLegalMoves(emptyBoard(), WHITE_TURN)).toBe(false);
    });

    it("is false when the last man is walled in — this ends the game", () => {
      const board = boardWith({
        d5: WHITE_PIECE,
        c6: BLACK_PIECE,
        e6: BLACK_PIECE,
        b7: BLACK_PIECE,
        f7: BLACK_PIECE,
      });

      expect(validator.hasAnyLegalMoves(board, WHITE_TURN)).toBe(false);
    });

    it("is true again as soon as one landing square opens up", () => {
      const board = boardWith({
        d5: WHITE_PIECE,
        c6: BLACK_PIECE,
        e6: BLACK_PIECE,
        b7: BLACK_PIECE,
      });

      expect(validator.hasAnyLegalMoves(board, WHITE_TURN)).toBe(true);
    });
  });
});
