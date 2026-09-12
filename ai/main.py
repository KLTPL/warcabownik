from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
import random

BOARD_SIZE = 8
EMPTY_CELL = 0
WHITE_PLAYER = 1
BLACK_PLAYER = 2

app = FastAPI(title="Checkers AI Mock")


class BoardRequest(BaseModel):
    board: list[list[int]]
    player_id: int = BLACK_PLAYER


class MoveResponse(BaseModel):
    fromPosition: dict[str, int]
    toPosition: dict[str, int]


def _is_within_bounds(y: int, x: int) -> bool:
    """Check if the given coordinates are inside the board limits."""
    return 0 <= y < BOARD_SIZE and 0 <= x < BOARD_SIZE


def _create_move(
    from_y: int, from_x: int, to_y: int, to_x: int
) -> dict[str, dict[str, int]]:
    """Helper to format the move payload consistently."""
    return {
        "fromPosition": {"y": from_y, "x": from_x},
        "toPosition": {"y": to_y, "x": to_x},
    }


def _get_piece_moves(
    board: list[list[int]],
    y: int,
    x: int,
    player_id: int,
    opponent_id: int,
    direction: int,
) -> tuple[list[dict], list[dict]]:
    """Evaluate regular and capture moves for a single piece to reduce loop nesting."""
    moves = []
    captures = []

    # early return if the piece doesn't belong to the current player
    if board[y][x] != player_id:
        return moves, captures

    new_y = y + direction

    for dx in [-1, 1]:
        new_x = x + dx

        if not _is_within_bounds(new_y, new_x):
            continue

        # regular move logic
        if board[new_y][new_x] == EMPTY_CELL:
            moves.append(_create_move(y, x, new_y, new_x))

        # capture move logic
        elif board[new_y][new_x] == opponent_id:
            jump_y = new_y + direction
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

    direction = -1 if player_id == BLACK_PLAYER else 1
    opponent_id = WHITE_PLAYER if player_id == BLACK_PLAYER else BLACK_PLAYER

    for y in range(BOARD_SIZE):
        for x in range(BOARD_SIZE):
            piece_moves, piece_captures = _get_piece_moves(
                board, y, x, player_id, opponent_id, direction
            )
            moves.extend(piece_moves)
            captures.extend(piece_captures)

    # force captures if any exist, otherwise return regular moves
    return captures if captures else moves


@app.post("/predict-move", response_model=MoveResponse)
async def predict_move(request: BoardRequest):
    # board validation using constants instead of magic numbers
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
