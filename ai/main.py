from fastapi import FastAPI
from pydantic import BaseModel
import torch
import numpy as np
from CheckersEnv import CheckersEnv
from Model import CheckersValueNet, prepare_layout_for_network

app = FastAPI()
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = CheckersValueNet().to(device)
model.load_state_dict(torch.load("checkers_model.pth", map_location=device))
model.eval()

env = CheckersEnv()

class BoardRequest(BaseModel):
    board: list
    player: int

def diff_boards(current, next_state):
    """Derives fromPosition and toPosition by comparing board matrices."""
    from_pos, to_pos = None, None
    for r in range(8):
        for c in range(8):
            if current[r][c] != 0 and next_state[r][c] == 0:
                from_pos = f"{r},{c}"
            elif current[r][c] == 0 and next_state[r][c] != 0:
                to_pos = f"{r},{c}"
    return from_pos, to_pos

@app.post("/get-best-move")
def get_best_move(data: BoardRequest):
    board = np.array(data.board, dtype=np.int8)
    player = data.player
    
    possible_futures = env.get_next_states(board, player)
    if not possible_futures:
        return {"error": "No legal moves available"}
        
    canonical_states = [
        f if player == 1 else f[::-1, ::-1] * -1 
        for f in possible_futures
    ]
    tensor_list = [prepare_layout_for_network(c) for c in canonical_states]
    batch_tensor = torch.stack(tensor_list).to(device)
    
    with torch.no_grad():
        values = model(batch_tensor)
        best_idx = torch.argmax(values).item()
        
    best_state = possible_futures[best_idx]
    from_pos, to_pos = diff_boards(board, best_state)
    
    return {
        "fromPosition": from_pos,
        "toPosition": to_pos
    }