import time
import math
import numpy as np


PUCT_CONST = 1.4
TIME_LIMIT = 2.0 # the mcts tree search time limit so the service wouldn work  

def prepare_layout_for_onnx_network(board):
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

    return state_tensor
    
class Node:
    def __init__(self, board_state, policy = None):
        self.values_sum = 0
        self.visit_count = 0
        self.policy = policy
        self.board = board_state
        self.childs = None
        self.puct_const = PUCT_CONST
        

    def PUCT_counting(self,  sqrt_parent_visit_count):
        values_mean = (self.values_sum / self.visit_count) if self.visit_count > 0 else 0 
        PUCT = values_mean + self.puct_const * self.policy * (sqrt_parent_visit_count / (self.visit_count + 1))
        return PUCT

    def select_child(self):
        puct_values = []
        sqrt_visit_count = math.sqrt(self.visit_count)
        
        for child_node in self.childs:
            puct_values.append(child_node.PUCT_counting(sqrt_visit_count))

        puct_values = np.array(puct_values)
        best_puct_index = np.argmax(puct_values)
        return self.childs[best_puct_index]

    def create_childrens(self, next_states_boards,  policy_list):
        self.childs = []
        for board, policy in zip(next_states_boards, policy_list):
            self.childs.append(Node(board, policy))

    def update(self, new_value):
        self.visit_count += 1
        self.values_sum += new_value

    def get_board(self):
        return self.board
            
    def empty(self):
        return self.childs is None

class DynamicMCTS:
    def __init__(self, env, model, current_board):
        self.env = env
        self.model = model # model is supposed to be loaded by onnxruntime not Pytorch
        self.model_input_name = self.model.get_inputs()[0].name
        self.current_board = current_board 
        self.time_limit = TIME_LIMIT
        self.moves = None
        self.cache = {}

    def set_time_limit(self, time_limit):
        self.time_limit = time_limit

    def chose_best_next_moves(self):
        start_time = time.time()

        self.env.next_move(self.current_board) # Its made on purpose so the starting layer is seems as the opponent board, so next layers(which are supposed to be chosen by model) are the model_player boards
        self.current_board = self.env.get_board()
        starting_node = Node(self.current_board)

        first_iteration = True
        while time.time() - start_time < self.time_limit:
            current_node = starting_node
            nodes_array = [current_node]

            while not current_node.empty():
                current_node = current_node.select_child()
                nodes_array.append(current_node)
        
            self.env.next_move(current_node.get_board())
            possible_next_layouts = []
            if first_iteration: # making sure that the lists of childrens have same arrange as the moves list
                next_moves_packages = self.env.get_next_states(collect_moves = True)
                possible_next_layouts = []
                possible_next_layout_moves = []
                for package in next_moves_packages:
                    possible_next_layouts.append(package["board"])
                    possible_next_layout_moves.append(package["moves"])
                self.moves = possible_next_layout_moves
                first_iteration = False
            else:
                possible_next_layouts = self.env.get_next_states()

            if not possible_next_layouts: # that means current node is the end of the game
                leaf_value = -1
            else:
                predictions_np_array = np.zeros(len(possible_next_layouts), dtype = np.float32)
                layouts_to_predict = []
                indexes_to_predict = []

                for idx, layout in enumerate(possible_next_layouts):
                    board_hash = hash(layout.tobytes())
                    if board_hash in self.cache:
                        predictions_np_array[idx] = self.cache[board_hash]
                    else:
                        layouts_to_predict.append(layout)
                        indexes_to_predict.append(idx)

                if len(layouts_to_predict) > 0:
                    tensor_layout_list = [prepare_layout_for_onnx_network(layout) for layout in layouts_to_predict]
                    batch_np_array = np.stack(tensor_layout_list).astype(np.float32)
                    predictions_raw = self.model.run(None, {self.model_input_name : batch_np_array})[0]
                    raw_values = predictions_raw.flatten()
                    
                    for val, original_idx, layout in zip(raw_values, indexes_to_predict, layouts_to_predict):
                        predictions_np_array[original_idx] = val
                        board_hash = hash(layout.tobytes())
                        self.cache[board_hash] = val
                 
                best_idx = np.argmax(predictions_np_array)

                max_prediction = np.max(predictions_np_array)
                exp_predictions = np.exp(predictions_np_array - max_prediction)
                policy = exp_predictions / np.sum(exp_predictions)

                current_node.create_childrens(possible_next_layouts, policy)
                leaf_value = predictions_np_array[best_idx]

            leaf_value = -leaf_value
            for node in reversed(nodes_array):
                node.update(leaf_value)
                leaf_value = -leaf_value

        
        childrens_visits_count = np.array([node.visit_count for node in starting_node.childs])
        best_child_idx = np.argmax(childrens_visits_count)

        return self.moves[best_child_idx]
