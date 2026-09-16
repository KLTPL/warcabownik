from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
import random

BOARD_SIZE = 8
EMPTY_CELL = 0
WHITE_PLAYER = 1
BLACK_PLAYER = 2
WHITE_KING = 3
BLACK_KING = 4

app = FastAPI(title="Checkers AI Mock")


class BoardRequest(BaseModel):
    board: list[list[int]]
    player_id: int = BLACK_PLAYER


class MoveResponse(BaseModel):
    fromPosition: dict[str, int]
    toPosition: dict[str, int]


def _is_within_bounds(y: int, x: int) -> bool:
    return 0 <= y < BOARD_SIZE and 0 <= x < BOARD_SIZE


def _create_move(
    from_y: int, from_x: int, to_y: int, to_x: int
) -> dict[str, dict[str, int]]:
    return {
        "fromPosition": {"y": from_y, "x": from_x},
        "toPosition": {"y": to_y, "x": to_x},
    }


def _get_piece_moves(
    board: list[list[int]],
    y: int,
    x: int,
    player_id: int,
) -> tuple[list[dict], list[dict]]:
    moves = []
    captures = []

    piece = board[y][x]

    is_black_turn = player_id in (BLACK_PLAYER, BLACK_KING)
    player_pieces = (
        {BLACK_PLAYER, BLACK_KING} if is_black_turn else {WHITE_PLAYER, WHITE_KING}
    )
    opponent_pieces = (
        {WHITE_PLAYER, WHITE_KING} if is_black_turn else {BLACK_PLAYER, BLACK_KING}
    )

    if piece not in player_pieces:
        return moves, captures
    is_king = (
        piece in (WHITE_KING, BLACK_KING)
        or (is_black_turn and y == 0)
        or (not is_black_turn and y == BOARD_SIZE - 1)
    )
    directions = [-1, 1] if is_king else ([-1] if is_black_turn else [1])

    for dy in directions:
        new_y = y + dy
        for dx in [-1, 1]:
            new_x = x + dx

            if not _is_within_bounds(new_y, new_x):
                continue

            if board[new_y][new_x] == EMPTY_CELL:
                moves.append(_create_move(y, x, new_y, new_x))
            elif board[new_y][new_x] in opponent_pieces:
                jump_y = new_y + dy
                jump_x = new_x + dx

                if (
                    _is_within_bounds(jump_y, jump_x)
                    and board[jump_y][jump_x] == EMPTY_CELL
                ):
                    captures.append(_create_move(y, x, jump_y, jump_x))

    return moves, captures


def find_possible_moves(board: list[list[int]], player_id: int) -> list[dict]:
    moves = []
    captures = []

    for y in range(BOARD_SIZE):
        for x in range(BOARD_SIZE):
            piece_moves, piece_captures = _get_piece_moves(board, y, x, player_id)
            moves.extend(piece_moves)
            captures.extend(piece_captures)

    return captures if captures else moves


@app.get("/health")
def health_check():
    return {"status": "awake"}


@app.post("/predict-move", response_model=MoveResponse)
async def predict_move(request: BoardRequest):
    if len(request.board) != BOARD_SIZE or any(
        len(row) != BOARD_SIZE for row in request.board
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Board must be {BOARD_SIZE}x{BOARD_SIZE}",
        )

    possible_moves = find_possible_moves(request.board, request.player_id)

    if not possible_moves:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No valid moves available"
        )

    return random.choice(possible_moves)
