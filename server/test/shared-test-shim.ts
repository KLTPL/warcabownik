// Jest-only stand-in for `@warcabownik/shared`, mapped via moduleNameMapper.
//
// `packages/shared` is published as an ESM package ("type": "module" in its
// package.json). Under this project's "nodenext" module resolution, any file
// that value-imports from it (not just types) compiles to a native ESM
// `require()`/`import` that ts-jest's CommonJS test runtime can't load. Since
// the only runtime (non type-only) export any backend code needs from the
// shared package is the `Side` enum, this shim re-declares just that here,
// under a package boundary jest can execute as CommonJS.
export enum Side {
  WHITE = "WHITE",
  BLACK = "BLACK",
}

export type GameStatus = "IN_PROGRESS" | "FINISHED" | "DRAW" | "ABANDONED";

export interface GameState {
  id: string;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  boardStateJson: string;
  status: GameStatus;
  winnerId: string | null;
}

export interface MovePayload {
  fromPosition: string;
  toPosition: string;
}
