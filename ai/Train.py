import torch
import torch.nn as nn
import torch.optim as optim
import random

from CheckersEnv import CheckersEnv
from Model import CheckersValueNet, prepare_state_for_network

class CheckersTrainer:
    def __init__(self, episodes=500, lr=0.001, epsilon=0.2, model_path="checkers_model.pth"):
        # Hyperparameters and configuration
        self.episodes = episodes
        self.lr = lr
        self.epsilon = epsilon
        self.model_path = model_path
        
        # Hardware setup
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self.device}")
        
        # Game and AI components
        self.env = CheckersEnv()
        self.model = CheckersValueNet().to(self.device)
        
        # Training tools
        self.optimizer = optim.Adam(self.model.parameters(), lr=self.lr)
        self.criterion = nn.MSELoss()

    def play_self_play_episode(self):
        """Simulates a full self-play game and returns history and winner."""
        state = self.env.create_starting_board()
        current_player = 1
        game_history = []
        
        while True:
            possible_futures = self.env.get_next_states(state, current_player)
            
            # Game over condition
            if len(possible_futures) == 0:
                winner = -current_player
                return game_history, winner
                
            # Epsilon-greedy exploration vs exploitation
            if random.random() < self.epsilon or len(possible_futures) == 1:
                next_state = random.choice(possible_futures)
            else:
                self.model.eval()
                best_state = None
                best_value = -float('inf')
                
                with torch.no_grad():
                    for future_state in possible_futures:
                        canonical = future_state if current_player == 1 else future_state[::-1, ::-1] * -1
                        tensor = prepare_state_for_network(canonical).to(self.device)
                        val = self.model(tensor).item()
                        
                        if val > best_value:
                            best_value = val
                            best_state = future_state
                next_state = best_state
                
            game_history.append((next_state, current_player))
            state = next_state
            current_player *= -1

    def train_on_episode(self, game_history, winner):
        """Performs backpropagation on a completed game's history."""
        self.model.train()
        total_loss = 0
        
        for board, player in game_history:
            target_value = 1.0 if player == winner else -1.0
            
            canonical = board if player == 1 else board[::-1, ::-1] * -1 #twist board and change white to black
            tensor_state = prepare_state_for_network(canonical).to(self.device)
            prediction = self.model(tensor_state)
            
            target_tensor = torch.tensor([[target_value]], dtype=torch.float32, device=self.device)
            loss = self.criterion(prediction, target_tensor)
            
            self.optimizer.zero_grad()
            loss.backward()
            self.optimizer.step()
            
            total_loss += loss.item()
            
        return total_loss / len(game_history) if game_history else 0

    def start_training(self):
        """Main training loop."""
        print(f"Starting training for {self.episodes} episodes...\n")
        
        for episode in range(self.episodes):
            history, winner = self.play_self_play_episode()
            avg_loss = self.train_on_episode(history, winner)
            
            if (episode + 1) % 50 == 0:
                winner_str = "White (1)" if winner == 1 else "Black (-1)"
                print(f"Episode {episode + 1}/{self.episodes} | Winner: {winner_str} | Avg Loss: {avg_loss:.4f}")
                
        # Save trained weights
        torch.save(self.model.state_dict(), self.model_path)
        print(f"\nTraining complete! Model saved as '{self.model_path}'.")

if __name__ == "__main__":
    # You can easily adjust parameters right here
    trainer = CheckersTrainer(episodes=500, lr=0.001, epsilon=0.2)
    trainer.start_training()