import torch
import torch.nn as nn
import torch.optim as optim
import random
import numpy as np

from CheckersEnv import CheckersEnv
from Model import CheckersValueNet, prepare_state_for_network

class CheckersTrainer:
    def __init__(self, episodes=2000, lr=0.001, epsilon=0.2, model_path="checkers_model.pth"):
        self.episodes = episodes
        self.lr = lr
        self.epsilon = epsilon
        self.model_path = model_path
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self.device}")
        
        self.env = CheckersEnv()
        self.model = CheckersValueNet().to(self.device)
        
        self.optimizer = optim.Adam(self.model.parameters(), lr=self.lr)
        self.criterion = nn.MSELoss()

    def play_self_play_episode(self):
        state = self.env.create_starting_board()
        current_player = 1
        game_history = []
        
        while True:
            possible_futures = self.env.get_next_states(state, current_player)
            
            if len(possible_futures) == 0:
                winner = -current_player
                return game_history, winner
                
            if random.random() < self.epsilon or len(possible_futures) == 1:
                next_state = random.choice(possible_futures)
            else:
                self.model.eval()
                
                
                canonical_states = [
                    f if current_player == 1 else f[::-1, ::-1] * -1 
                    for f in possible_futures
                ]
                tensor_list = [prepare_state_for_network(c) for c in canonical_states]
                batch_tensor = torch.stack(tensor_list).to(self.device)
                
                with torch.no_grad():
                    values = self.model(batch_tensor)
                    best_idx = torch.argmax(values).item()
                    
                next_state = possible_futures[best_idx]
                
            game_history.append((next_state, current_player))
            state = next_state
            current_player *= -1

    def train_on_episode(self, game_history, winner):
        if not game_history:
            return 0.0
            
        self.model.train()
        
        states_list = []
        targets_list = []
        
        for board, player in game_history:
            target_value = 1.0 if player == winner else -1.0
            canonical = board if player == 1 else board[::-1, ::-1] * -1
            
            states_list.append(prepare_state_for_network(canonical))
            targets_list.append([target_value])
            
        # OPTYMALIZACJA: Masowa aktualizacja wag z całej gry jednym strzałem
        batch_states = torch.stack(states_list).to(self.device)
        batch_targets = torch.tensor(targets_list, dtype=torch.float32, device=self.device)
        
        predictions = self.model(batch_states)
        loss = self.criterion(predictions, batch_targets)
        
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()
        
        return loss.item()

    def start_training(self):
        print(f"Starting optimized training for {self.episodes} episodes...\n")
        
        for episode in range(self.episodes):
            history, winner = self.play_self_play_episode()
            avg_loss = self.train_on_episode(history, winner)
            
            if (episode + 1) % 50 == 0:
                winner_str = "White (1)" if winner == 1 else "Black (-1)"
                print(f"Episode {episode + 1}/{self.episodes} | Winner: {winner_str} | Loss: {avg_loss:.4f}")
                
        torch.save(self.model.state_dict(), self.model_path)
        print(f"\nTraining complete! Model saved as '{self.model_path}'.")

if __name__ == "__main__":
    trainer = CheckersTrainer(episodes=2000, lr=0.001, epsilon=0.2)
    trainer.start_training()