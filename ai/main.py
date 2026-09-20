import os
import random
import numpy as np
import torch
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from CheckersEnv import CheckersEnv
from Model import CheckersValueNet, prepare_layout_for_network

API_EMPTY = 0
API_WHITE_MAN = 1
API_BLACK_MAN = 2
API_WHITE_KING = 3
API_BLACK_KING = 4

ENV_EMPTY = 0
ENV_WHITE_MAN = 1
ENV_BLACK_MAN = -1
ENV_WHITE_KING = 2
ENV_BLACK_KING = -2

BOARD_SIZE = 8

API_WHITE_PLAYER = 1
API_BLACK_PLAYER = 2

ENV_WHITE_PLAYER = 1
ENV_BLACK_PLAYER = -1

CHECKERS_MODEL_WEIGHTS_PATH = "checkers_model.pth"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = CheckersValueNet().to(device)

try:
    model.load_state_dict(torch.load(CHECKERS_MODEL_WEIGHTS_PATH, map_location=device, weights_only=True))
    print(f"Successfully loaded model into :{device}")
except FileNotFoundError:
    print(f"WARNING: file {CHECKERS_MODEL_WEIGHTS_PATH} not found")

app = FastAPI(title="Checkers AI Mock")
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BoardRequest(BaseModel):
    board: list[list[int]]
    player_id: int = API_BLACK_PLAYER


class MoveResponse(BaseModel):
    fromPosition: dict[str, int]
    toPosition: dict[str, int]



def translate_board_to_env(board_request, player):
    translate_dict={
        API_EMPTY: ENV_EMPTY, 
        API_WHITE_MAN: ENV_WHITE_MAN,
        API_BLACK_MAN: ENV_BLACK_MAN,
        API_WHITE_KING: ENV_WHITE_KING,
        API_BLACK_KING: ENV_BLACK_KING
    }

    env_board = np.full((BOARD_SIZE,BOARD_SIZE),0)
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            env_board[row,col] = translate_dict[board_request[row][col]]

    env = CheckersEnv()
    env.load_board(env_board)
    
    if player == API_BLACK_PLAYER:
        env.set_player(ENV_BLACK_PLAYER)
        env.change_sites()
    else:
        env.rotate_board(keep_colours=True)
        env.set_player(ENV_WHITE_PLAYER)
       
    return env

def select_move(env: CheckersEnv):
    possible_layouts = env.get_next_states()

    if not possible_layouts:
        return None

    if not possible_layouts:
        return None
    
    if len(possible_layouts)==1:
        return possible_layouts[0]

    tensor_layout_list=[prepare_layout_for_network(layout) for layout in possible_layouts]
    batch_tensor = torch.stack(tensor_layout_list).to(device)

    with torch.no_grad():
        predictions = model(batch_tensor)
        best_idx = torch.argmax(predictions).item()

    return possible_layouts[best_idx]
    
def translate_layout_to_response(old_layout, next_layout, player):

    if player == ENV_WHITE_PLAYER:
        next_layout = next_layout[::-1, ::-1].copy() #rotating board back to input state 
        old_layout = old_layout[::-1, ::-1].copy()
    if player == ENV_BLACK_PLAYER:
        next_layout = next_layout.copy() * -1
        old_layout = old_layout.copy() *-1
    first_cord = None
    second_cord = None
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            if old_layout[row,col]*player > ENV_EMPTY and next_layout[row,col]==ENV_EMPTY:
                first_cord = {"y": row, "x":col}
            if next_layout[row,col]*player > ENV_EMPTY and old_layout[row,col]==ENV_EMPTY:
                second_cord = {"y": row, "x":col}
    return first_cord, second_cord

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
    env = translate_board_to_env(request.board, request.player_id)
    old_board = env.get_board()
    player = env.get_player()

    best_next_layout = select_move(env)

    if best_next_layout is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No valid moves available"
        )

    from_pos, to_pos = translate_layout_to_response(old_board, best_next_layout, player)

    if from_pos is None or to_pos is None:
         raise HTTPException(status_code=500, detail="Error calculating move coordinates")

    return {
        "fromPosition": from_pos,
        "toPosition": to_pos
    }
