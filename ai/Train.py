import torch
import torch.nn as nn
import torch.optim as optim
import random
import numpy as np
import torch

MAX_GAME_LEN = 150
TIE =0.0
import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

from CheckersEnv import CheckersEnv
from Model import CheckersValueNet, prepare_layout_for_network

class CheckersTrainer:
    def __init__(self, episodes=50000, lr=0.001, model_path="checkers_model.pth"):
        self.episodes = episodes
        self.lr = lr
        
        
        self.epsilon = 1.0           
        self.min_epsilon = 0.05     
        self.epsilon_decay = 0.9992 
        
        self.model_path = model_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self.device}")
        
        self.env = CheckersEnv()
        self.model = CheckersValueNet().to(self.device)
        self.optimizer = optim.Adam(self.model.parameters(), lr=self.lr)
        self.criterion = nn.MSELoss()

    def play_self_play_episode(self):
        
        self.env.create_starting_state()
        game_history = []

        while True:
            possible_board_layouts = self.env.get_next_states()

            if len(possible_board_layouts)==0: # that means there are no aviable moves to do so current player loses
                winner = -self.env.get_player()
                return game_history, winner
            
            if len(game_history)>150:
                return game_history, TIE
            
            if random.random() < self.epsilon or len(possible_board_layouts) == 1: # decides if next move is genereted random with propability of self.epsilon
                board_choice = random.choice(possible_board_layouts)
            else:
                self.model.eval()
                tensor_layout_list = [prepare_layout_for_network(layout) for layout in possible_board_layouts]
                batch_tensor = torch.stack(tensor_layout_list).to(self.device)

                with torch.no_grad():
                    values_prediction = self.model(batch_tensor)
                    best_idx = torch.argmax(values_prediction).item()

                board_choice = possible_board_layouts[best_idx]

            game_history.append((board_choice, self.env.get_player()))
            self.env.next_move(board_choice)

    def train_on_episode(self, game_history, winner):
        
        if not game_history:
            return 0.0
            
        self.model.train()
        
        states_list = []
        targets_list = []
        
        for board, player in game_history:
            target_value = player * winner 
            
            states_list.append(prepare_layout_for_network(board))
            targets_list.append([target_value])
            
        batch_states = torch.stack(states_list).to(self.device)
        batch_targets = torch.tensor(targets_list, dtype=torch.float32, device=self.device)
        
        predictions = self.model(batch_states)
        loss = self.criterion(predictions, batch_targets)
        
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()
        
        return loss.item()

    def start_training(self):
        print(f"Starting long training for {self.episodes} episodes...\n")
        
        for episode in range(self.episodes):
            history, winner = self.play_self_play_episode()
            avg_loss = self.train_on_episode(history, winner)
            
           
            self.epsilon = max(self.min_epsilon, self.epsilon * self.epsilon_decay)
            if (episode + 1) % 10000 == 0:
                checkpoint_path = f"checkers_model_{episode + 1}ep.pth"
                torch.save(self.model.state_dict(), checkpoint_path)
                print(f"--> saved checkpoint: {checkpoint_path}")
            if (episode + 1) % 500 == 0:  
                if winner == 1:
                    winner_str = "white (1)"
                elif winner ==0:
                    winner_str = "Tie (0)"
                else:
                    winner_str = "Black (-1)"
                print(f"Ep {episode + 1}/{self.episodes} | Epsilon: {self.epsilon:.3f} | Winner: {winner_str} | Loss: {avg_loss:.4f}")
            torch.cuda.empty_cache()

        torch.save(self.model.state_dict(), self.model_path)
        print(f"\nTraining complete! Model saved as '{self.model_path}'.")

if __name__ == "__main__":
    trainer = CheckersTrainer()
    trainer.start_training()
