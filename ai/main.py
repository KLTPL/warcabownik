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


class SingleMove(BaseModel):
    fromPosition: dict[str, int]
    toPosition: dict[str, int]

class MoveResponse(BaseModel):
    moves: list[SingleMove]



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
def unpack_possible_layouts_packages(possible_layouts_packages):
    possible_layouts = []
    layouts_moves_list = []
    for package in possible_layouts_packages:
        possible_layouts.append(package["board"])
        layouts_moves_list.append(package["moves"])

    return possible_layouts, layouts_moves_list

def select_move(env: CheckersEnv):
    possible_layouts_packages = env.get_next_states(collect_moves=True)

    if not possible_layouts_packages:
        return None

    possible_layouts, layouts_moves_list = unpack_possible_layouts_packages(possible_layouts_packages)
    
    if len(possible_layouts)==1:
        return layouts_moves_list[0]

    tensor_layout_list=[prepare_layout_for_network(layout) for layout in possible_layouts]
    batch_tensor = torch.stack(tensor_layout_list).to(device)

    with torch.no_grad():
        predictions = model(batch_tensor)
        best_idx = torch.argmax(predictions).item()

    return layouts_moves_list[best_idx]

def translate_moves_list_to_response(moves_list, player):
    response_moves_list = []
    for move in moves_list:
        first_cord = None
        second_cord = None
        from_row_cord = move["fromPosition"][0]
        from_col_cord = move["fromPosition"][1]
        to_row_cord = move["toPosition"][0]
        to_col_cord = move["toPosition"][1]
        if player == ENV_BLACK_PLAYER:
            first_cord = {"y": from_row_cord, "x": from_col_cord}
            second_cord = {"y": to_row_cord, "x": to_col_cord}
        elif player == ENV_WHITE_PLAYER:
            first_cord = {"y": BOARD_SIZE - from_row_cord -1 , "x": BOARD_SIZE - from_col_cord -1}
            second_cord = {"y": BOARD_SIZE - to_row_cord -1, "x": BOARD_SIZE - to_col_cord -1}
        SingleMove = {
            "fromPosition":first_cord,
            "toPosition":second_cord
        }
        response_moves_list.append(SingleMove)
    return response_moves_list

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
    player = env.get_player()

    best_layout_moves = select_move(env)

    if best_layout_moves is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No valid moves available"
        )

    moves_to_response = translate_moves_list_to_response(best_layout_moves, player)

    if not moves_to_response:
         raise HTTPException(status_code=500, detail="Error calculating move coordinates")

    return {
        "moves": moves_to_response
    }

