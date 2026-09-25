import { getPiece, parsePosition } from "./board.utils";
import {
  ASCII_A,
  BLACK_PIECE,
  BOARD_MAX,
  BOARD_MIN,
  BOARD_SIZE,
  EMPTY_SQUARE,
  WHITE_KING,
  WHITE_PIECE,
} from "./game.constants";

const emptyBoard = (): string[][] =>
  Array.from({ length: BOARD_SIZE }, () =>
    Array<string>(BOARD_SIZE).fill(EMPTY_SQUARE),
  );

/** Inverse of parsePosition, as used by AiService.toAlgebraic. */
const toAlgebraic = (x: number, y: number): string =>
  `${String.fromCharCode(ASCII_A + x)}${y + 1}`;

describe("parsePosition", () => {
  it.each([
    ["a1", { x: 0, y: 0 }],
    ["h8", { x: 7, y: 7 }],
    ["e4", { x: 4, y: 3 }],
    ["a8", { x: 0, y: 7 }],
    ["h1", { x: 7, y: 0 }],
  ])("maps %s to %j", (square, expected) => {
    expect(parsePosition(square)).toEqual(expected);
  });

  it("is case insensitive", () => {
    expect(parsePosition("A1")).toEqual(parsePosition("a1"));
    expect(parsePosition("H8")).toEqual(parsePosition("h8"));
  });

  it("round-trips every square on the board", () => {
    for (let y = BOARD_MIN; y <= BOARD_MAX; y++) {
      for (let x = BOARD_MIN; x <= BOARD_MAX; x++) {
        const square = toAlgebraic(x, y);
        expect(parsePosition(square)).toEqual({ x, y });
      }
    }
  });
});

describe("getPiece", () => {
  it("returns the piece standing on a square", () => {
    const board = emptyBoard();
    board[3][4] = WHITE_PIECE;
    board[6][1] = BLACK_PIECE;
    board[0][0] = WHITE_KING;

    expect(getPiece(board, 4, 3)).toBe(WHITE_PIECE);
    expect(getPiece(board, 1, 6)).toBe(BLACK_PIECE);
    expect(getPiece(board, 0, 0)).toBe(WHITE_KING);
  });

  it("returns an empty square as such, not as a miss", () => {
    expect(getPiece(emptyBoard(), 4, 3)).toBe(EMPTY_SQUARE);
  });

  it.each([
    ["left of the board", -1, 3],
    ["right of the board", BOARD_SIZE, 3],
    ["below the board", 3, -1],
    ["above the board", 3, BOARD_SIZE],
  ])("returns null %s", (_label, x, y) => {
    expect(getPiece(emptyBoard(), x, y)).toBeNull();
  });

  it("returns null for coordinates that are not real squares", () => {
    // parsePosition yields NaN for a malformed position such as "zz", and a
    // NaN index slips past a plain `< MIN || > MAX` bounds check.
    expect(getPiece(emptyBoard(), 0, Number.NaN)).toBeNull();
    expect(getPiece(emptyBoard(), Number.NaN, 0)).toBeNull();
    expect(getPiece(emptyBoard(), 1.5, 2)).toBeNull();
  });
});
