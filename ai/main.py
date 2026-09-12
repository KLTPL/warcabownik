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
    captures = []

    direction = -1 if player_id == 2 else 1
    opponent_id = 1 if player_id == 2 else 2

    for y in range(8):
        for x in range(8):
            if board[y][x] == player_id:
                new_y = y + direction

                for dx in [-1, 1]:
                    new_x = x + dx

                    if 0 <= new_x < 8 and 0 <= new_y < 8:
                        if board[new_y][new_x] == 0:
                            moves.append(
                                {
                                    "fromPosition": {"y": y, "x": x},
                                    "toPosition": {"y": new_y, "x": new_x},
                                }
                            )
                        elif board[new_y][new_x] == opponent_id:
                            jump_y = new_y + direction
                            jump_x = new_x + dx

                            if 0 <= jump_x < 8 and 0 <= jump_y < 8:
                                if board[jump_y][jump_x] == 0:
                                    captures.append(
                                        {
                                            "fromPosition": {"y": y, "x": x},
                                            "toPosition": {"y": jump_y, "x": jump_x},
                                        }
                                    )

    return captures if len(captures) > 0 else moves


@app.post("/predict-move", response_model=MoveResponse)
async def predict_move(request: BoardRequest):
    if len(request.board) != 8 or any(len(row) != 8 for row in request.board):
        raise HTTPException(status_code=400, detail="Board must be 8x8")

    possible_moves = find_possible_moves(request.board, request.player_id)

    if not possible_moves:
        raise HTTPException(status_code=404, detail="No valid moves available")

    selected_move = random.choice(possible_moves)

    return selected_move
