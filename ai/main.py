from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import random

app = FastAPI(title="Checkers AI Mock")


class BoardRequest(BaseModel):
    # 8x8 grid: 0=empty, 1=white, 2=black
    board: List[List[int]]
    player_id: int = 2


class MoveResponse(BaseModel):
    fromPosition: dict
    toPosition: dict


def find_possible_moves(board: List[List[int]], player_id: int) -> List[dict]:
    moves = []

    # direction: 2 (black) moves down (+1), 1 (white) moves up (-1)
    direction = 1 if player_id == 2 else -1

    for y in range(8):
        for x in range(8):
            if board[y][x] == player_id:
                new_y = y + direction

                # Check diagonal moves (left and right)
                for new_x in [x - 1, x + 1]:
                    # Ensure move is within board limits and target is empty
                    if 0 <= new_x < 8 and 0 <= new_y < 8:
                        if board[new_y][new_x] == 0:
                            moves.append(
                                {
                                    "fromPosition": {"y": y, "x": x},
                                    "toPosition": {"y": new_y, "x": new_x},
                                }
                            )
    return moves


@app.post("/predict-move", response_model=MoveResponse)
async def predict_move(request: BoardRequest):
    if len(request.board) != 8 or any(len(row) != 8 for row in request.board):
        raise HTTPException(status_code=400, detail="Board must be 8x8")

    possible_moves = find_possible_moves(request.board, request.player_id)

    if not possible_moves:
        raise HTTPException(status_code=404, detail="No valid moves available")

    selected_move = random.choice(possible_moves)

    return selected_move
