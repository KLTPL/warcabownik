import torch
import torch.nn as nn
import torch.optim as optim
import random
import numpy as np
import torch

from persistence_mcts import PersistenceMCTS
from checkers_env import CheckersEnv

MAX_GAME_LEN = 150
TIE_WEIGHT =0.0
WIN_WEIGHT = 1.0
import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

from model import CheckersValueNet, prepare_layout_for_network

class CheckersTrainer:
    def __init__(self, episodes=100000, lr=0.0002, model_path="checkers_model.pth"):
        self.episodes = episodes
        self.lr = lr
        self.model_path = model_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self.device}")
        self.env = CheckersEnv()
        self.model = CheckersValueNet().to(self.device)
        self.optimizer = optim.Adam(self.model.parameters(), lr=self.lr)
        self.criterion = nn.MSELoss()

    def play_self_play_episode(self):
        iter_count = 0
        board = np.zeros((8,8), dtype=np.int32)
        self.env.create_starting_state_py()
        self.env.get_board_py(board)
        mcts = PersistenceMCTS(board, self.model)
        boards = []
        policies = []
        values = []

        while True and iter_count<1:
            if not mcts.next_step(boards, policies, values):
                values[len(values)-1] = np.full((1), -1.0, dtype = np.float32)
                break 
            
            raw_board = np.asarray(mcts.root.board)
            self.env.next_move_py(raw_board)

            if self.env.is_tie_py():
                values[len(values)-1] = np.full((1), 0.0, dtype = np.float32)
                break

            iter_count += 1
            
         

        return boards, policies, values

    def train_on_episode(self, boards, policies, values):

        """
        if not boards:
            return 0.0
            
        self.model.train()

        boards_batch = torch.tensor(np.array(boards), dtype=torch.float32, device = self.device)
        batch_target_pol = torch.tensor(np.array(policies), dtype=torch.float32, device=self.device)
        batch_target_val = torch.tensor(np.array(values), dtype=torch.float32, device=self.device)

        pred_pol, pred_val = self.model(boards_batch)

        loss_policy = -torch.mean(torch.sum(batch_target_pol * torch.log(pred_pol + 1e-8), dim=1))
        loss_value = self.criterion(pred_val, batch_target_val)
        loss = loss_policy + loss_value

        
        self.optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
        self.optimizer.step()
        
        return loss.item()
        """
        return 0.0
    
    def start_training(self):
        print(f"Rozpoczynam trening (dry-run) na {self.episodes} epizodów...\n")
        
        for episode in range(self.episodes):
            
            self.model.eval()
            
            boards, policies, values = self.play_self_play_episode()
            history_len = len(boards)
            
            avg_loss = self.train_on_episode(boards, policies, values)
            
            last_value = values[-1][0] 
            
            if last_value == 0.0:
                winner_str = "Remis (0)"
            elif history_len % 2 == 1:
                winner_str = "Białe (1)"
            else:
                winner_str = "Czarne (-1)"
                
            # Drukujemy logi co każdy epizod (skoro to tylko 5 próbnych)
            print(f"Ep {episode + 1}/{self.episodes} | Ruchów: {history_len} | Zwycięzca: {winner_str} | Loss: {avg_loss:.4f}")
            
            # Zapisz checkpoint, jeśli odpalałbyś to na dłużej
            if (episode + 1) % 10000 == 0:
                checkpoint_path = f"checkers_model_{episode + 1}ep.pth"
                torch.save(self.model.state_dict(), checkpoint_path)
                print(f"--> saved checkpoint: {checkpoint_path}")
            
            # Czyszczenie pamięci (dobra praktyka w PyTorch)
            torch.cuda.empty_cache()

        # Zapis na sam koniec pętli
        torch.save(self.model.state_dict(), self.model_path)
        print(f"\nTraining complete! Model saved as '{self.model_path}'.")

if __name__ == "__main__":
    # Odpalamy tylko 5 epizodów, żeby sprawdzić czy wszystko płynnie przechodzi
    trainer = CheckersTrainer(episodes=1)
    trainer.start_training()

