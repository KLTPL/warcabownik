import torch
import torch.nn as nn
import torch.optim as optim
import random
import numpy as np
import torch
from collections import deque

MAX_GAME_LEN = 150
TIE_WEIGHT =0.0
WIN_WEIGHT = 1.0
import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

from CheckersEnv import CheckersEnv
from Model import CheckersValueNet, prepare_layout_for_network

class CheckersTrainer:
    def __init__(self, episodes=100000, lr=0.0002, model_path="checkers_model.pth"):
        self.episodes = episodes
        self.lr = lr
        
        self.gamma = 0.96
        self.epsilon = 1.0           
        self.min_epsilon = 0.05     
        self.epsilon_decay = 0.999965
        self.n_step_looking_forward = 6

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
                last_game = game_history[-1]
                game_history[-1] = (last_game[0], WIN_WEIGHT)
                return game_history
            
            if len(game_history)>150:
                last_game = game_history[-1]
                game_history[-1] = (last_game[0], TIE_WEIGHT)
                return game_history
            
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

            game_history.append((board_choice, self.env.get_reward(board_choice)))
            self.env.next_move(board_choice)

    def create_targets(self, reward_list, values_predictions):
        size = len(reward_list)
        targets_list = []
        n_steps = self.n_step_looking_forward
        for index in range(size):
            target = 0.0
            gamma = 1.0
            t=0
            while (t<n_steps+1 and index+t<size):
                sign = 1 if t %2 == 0 else -1
                if t == n_steps:
                    target += values_predictions[index+t]*gamma*sign
                else:
                    target += reward_list[index+t]*gamma*sign
                    
                if t %2 == 1:
                    gamma *= self.gamma
                t=t+1
            targets_list.append([float(target)])
        return targets_list

    def train_on_episode(self, game_history):
        
        if not game_history:
            return 0.0
            
        self.model.train()
        
        tensor_layouts_list = []
        rewards_list = [] 
        
        for board, reward in game_history:
            tensor_layouts_list.append(prepare_layout_for_network(board))
            rewards_list.append(reward)

        batch_layouts_list = torch.stack(tensor_layouts_list).to(self.device)

        with torch.no_grad():
            self.model.eval()
            future_predictions = self.model(batch_layouts_list).squeeze(-1).cpu().numpy()

        self.model.train()

        targets_list = self.create_targets(rewards_list, future_predictions)
        batch_targets = torch.tensor(targets_list, dtype=torch.float32, device=self.device)

        current_predictions=self.model(batch_layouts_list)

        loss = self.criterion(current_predictions, batch_targets)
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()
        
        return loss.item()

    def start_training(self):
        print(f"Starting long training for {self.episodes} episodes...\n")
        
        for episode in range(self.episodes):
            history = self.play_self_play_episode()
            history_len = len(history)
            avg_loss = self.train_on_episode(history)
        
           
            self.epsilon = max(self.min_epsilon, self.epsilon * self.epsilon_decay)
            if (episode + 1) % 10000 == 0:
                checkpoint_path = f"checkers_model_{episode + 1}ep.pth"
                torch.save(self.model.state_dict(), checkpoint_path)
                print(f"--> saved checkpoint: {checkpoint_path}")
            if (episode + 1) % 500 == 0:  
                if history_len %2 == 1:
                    winner_str = "white (1)"
                else:
                    winner_str = "Black (-1)"
                    
                print(f"Ep {episode + 1}/{self.episodes} | Epsilon: {self.epsilon:.3f} | Winner: {winner_str} | Loss: {avg_loss:.4f}")
            torch.cuda.empty_cache()

        torch.save(self.model.state_dict(), self.model_path)
        print(f"\nTraining complete! Model saved as '{self.model_path}'.")

if __name__ == "__main__":
    trainer = CheckersTrainer()
    trainer.start_training()
