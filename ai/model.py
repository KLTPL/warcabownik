import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

def prepare_layout_for_network(board):
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
    
    return torch.from_numpy(state_tensor)

class CheckersValueNet(nn.Module):
    def __init__(self):
        super(CheckersValueNet, self).__init__()
        
        self.conv1 = nn.Conv2d(in_channels=4, out_channels=32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        self.conv2 = nn.Conv2d(in_channels=32, out_channels=64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        self.conv3 = nn.Conv2d(in_channels=64, out_channels=128, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(128)

        self.policy_conv = nn.Conv2d(in_channels=128, out_channels=2, kernel_size=1)
        self.policy_bn = nn.BatchNorm2d(2)
        self.policy_fc = nn.Linear(2 * 8 * 8, 1024)

        self.value_conv = nn.Conv2d(in_channels=128, out_channels=1, kernel_size=1)
        self.value_bn = nn.BatchNorm2d(1)
        self.value_fc1 = nn.Linear(1 * 8 * 8, 256)
        self.value_fc2 = nn.Linear(256, 1)

    def forward(self, x):
        x = F.relu(self.bn1(self.conv1(x)))
        x = F.relu(self.bn2(self.conv2(x)))
        x = F.relu(self.bn3(self.conv3(x)))

        p = F.relu(self.policy_bn(self.policy_conv(x)))
        p = p.view(p.size(0),-1)
        p = self.policy_fc(p)

        policy_out = F.softmax(p, dim=1)

        v = F.relu(self.value_bn(self.value_conv(x)))
        v = v.view(v.size(0),-1)
        v = F.relu(self.value_fc1(v))
        v = self.value_fc2(v)

        value_out = torch.tanh(v)

        return policy_out, value_out