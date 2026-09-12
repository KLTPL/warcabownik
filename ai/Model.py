import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

# Helper function: Translates our 8x8 board into a (4, 8, 8) format for PyTorch
def prepare_state_for_network(board):
    """
    Splits the 8x8 matrix into 4 separate binary channels:
    Channel 0: Our men (1)
    Channel 1: Our kings (2)
    Channel 2: Enemy men (-1)
    Channel 3: Enemy kings (-2)
    """
    state_tensor = np.zeros((4, 8, 8), dtype=np.float32)
    
    state_tensor[0] = (board == 1).astype(np.float32)
    state_tensor[1] = (board == 2).astype(np.float32)
    state_tensor[2] = (board == -1).astype(np.float32)
    state_tensor[3] = (board == -2).astype(np.float32)
    
    # Convert numpy array to PyTorch tensor and add a "Batch" dimension at the beginning
    # Resulting shape: (1, 4, 8, 8)
    return torch.from_numpy(state_tensor).unsqueeze(0)


class CheckersValueNet(nn.Module):
    def __init__(self):
        super(CheckersValueNet, self).__init__()
        
        # --- CONVOLUTIONAL BLOCK (The eyes of the model) ---
        # Input: 4 channels (our men, our kings, enemy men, enemy kings)
        # Output: 32 filters looking for patterns (e.g., defensive formations, gaps)
        self.conv1 = nn.Conv2d(in_channels=4, out_channels=32, kernel_size=3, padding=1)
        
        # The next layer looks at it more broadly (finds relationships between patterns)
        self.conv2 = nn.Conv2d(in_channels=32, out_channels=64, kernel_size=3, padding=1)
        self.conv3 = nn.Conv2d(in_channels=64, out_channels=128, kernel_size=3, padding=1)
        
        # --- DECISION BLOCK (The brain of the model) ---
        # Flatten the 3D maps from convolutions into one long vector
        # 128 channels * 8 height * 8 width = 8192
        self.fc1 = nn.Linear(128 * 8 * 8, 256)
        
        # The final layer returns exactly ONE number (board evaluation)
        self.fc2 = nn.Linear(256, 1)

    def forward(self, x):
        # Pass data through convolutions with ReLU activation function (removes negative values)
        x = F.relu(self.conv1(x))
        x = F.relu(self.conv2(x))
        x = F.relu(self.conv3(x))
        
        # Flatten the data for the dense (Linear) layers
        x = x.view(-1, 128 * 8 * 8)
        
        x = F.relu(self.fc1(x))
        
        # At the very end, we use the Tanh activation!
        # Why? Because Tanh ALWAYS returns a result in the range of -1 to 1.
        # 1.0 = I win, -1.0 = I lose, 0.0 = draw / equal game
        x = torch.tanh(self.fc2(x))
        
        return x


