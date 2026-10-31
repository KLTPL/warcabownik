import numpy as np
cimport numpy as np
import torch

from checkers_env cimport CheckersEnv
from libc.math cimport sqrt



cdef class PersistenceMCTS:

    def __init__(self, int[:,:] board, object model,
                 int iteration_limit=256,
                 int max_nodes=1000000,
                 int temperature_moves=20,
                 float puct_const=1.41,
                 float dirichlet_alpha=1.0,
                 float dirichlet_eps=0.25):
        self.iteration_limit = iteration_limit # search iterations per move
        self.max_nodes = max_nodes # capacity of the tree arrays
        self.temperature_moves = temperature_moves # first moves sampled proportionally to visits
        self.puct_const = puct_const
        self.dirichlet_alpha = dirichlet_alpha # ~10 / average number of legal moves
        self.dirichlet_eps = dirichlet_eps # share of the noise in root priors
        self.new_node_id = 0
        self.root_id = 0
        self.current_package_id = 0
        self.env = CheckersEnv()
        self.env.next_move(board)
        self.env.get_board(board) # on purpose rotating board so the start is seems as opponent move
        
        self.boards = np.zeros((max_nodes, BOARD_SIZE, BOARD_SIZE), dtype=np.int32)
        self.move_policys_id = np.full((max_nodes,), ILLEGAL_MOVE, dtype=np.int32)
        self.policys = np.zeros((max_nodes,), dtype=np.float32)
        self.values_sum = np.zeros((max_nodes,), dtype=np.float32)
        self.childs_real_sizes = np.full((max_nodes,), -1, dtype=np.int32)
        self.self_values = np.zeros((max_nodes,), dtype=np.float32)
        self.first_child_ids = np.full((max_nodes,), -1, dtype=np.int32)
        self.visits_counts = np.zeros((max_nodes,), dtype=np.int32)


        self.action_counts = np.empty((ACTION_SPACE_SIZE), np.int32)
        self.action_ids = np.empty((POSSIBLE_NEXT_MOVES_SIZE,), dtype=np.int32)
        self.moves = np.empty((POSSIBLE_NEXT_MOVES_SIZE, MOVES_SERIES_SIZE, 2), dtype=np.int32)
        self.possible_next_layouts = np.empty((POSSIBLE_NEXT_MOVES_SIZE, BOARD_SIZE, BOARD_SIZE), dtype=np.int32)
        self.visited_nodes_ids = np.empty((iteration_limit + 1,), dtype=np.int32) # search path never gets deeper than the root's visits
        self.uncut_batch = np.empty((1, STATE_TENSOR_SIZE, BOARD_SIZE, BOARD_SIZE), dtype=np.float32)

        self.predictions_boards_batch = np.zeros((MAX_GAME_PLIES, STATE_TENSOR_SIZE, BOARD_SIZE, BOARD_SIZE), dtype=np.float32)
        self.expected_policys_batch = np.zeros((MAX_GAME_PLIES, ACTION_SPACE_SIZE), dtype=np.float32)
        self.expected_values_batch = np.zeros((MAX_GAME_PLIES, 1), dtype=np.float32)

        self.model = model
        self.rng = np.random.default_rng() # seeded from OS entropy per object, so forked processes don't play identical games

        self.create_root(board)

    cdef void change_root(self, int node_id):
        self.root_id = node_id 

    cdef void copy_board(self, int[:,:] from_board, int[:,:] to_board):
        cdef int row
        cdef int col
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                to_board[row][col] = from_board[row][col]

    cdef bint node_exists(self,int node_id):
        return self.childs_real_sizes[node_id] >= 0

    cdef bint node_empty(self, int node_id):
        return self.childs_real_sizes[node_id] == 0

    cdef void create_root(self, int[:,:] board):
        # root has no parent and wasn't created by any move
        cdef int created_node_id = self.new_node_id
        self.root_id = created_node_id
        self.copy_board(board, self.boards[created_node_id])
        self.move_policys_id[created_node_id] = ILLEGAL_MOVE
        self.policys[created_node_id] = 0.0
        self.values_sum[created_node_id] = 0.0
        self.childs_real_sizes[created_node_id] = -1
        self.first_child_ids[created_node_id] = -1
        self.visits_counts[created_node_id] = 0
        self.new_node_id += 1

    cdef void create_node(self,int parent_id, float policy, int move_policy_id, int[:,:] board):
        cdef int created_node_id = self.new_node_id
        self.childs_real_sizes[parent_id] +=1
        self.copy_board(board, self.boards[created_node_id])
        self.move_policys_id[created_node_id] = move_policy_id
        self.policys[created_node_id] = policy
        self.values_sum[created_node_id] = 0.0
        self.childs_real_sizes[created_node_id] = -1
        self.first_child_ids[created_node_id] = -1
        self.visits_counts[created_node_id] = 0
        self.new_node_id += 1
    

    cdef float count_puct(self, int node_id, float parent_sqrt_visits):
        cdef float Q
        cdef float U
        if self.visits_counts[node_id] == 0:
            Q = 0.0
        else:
            Q = self.values_sum[node_id] / self.visits_counts[node_id]

        U = self.policys[node_id] * self.puct_const * (parent_sqrt_visits/(self.visits_counts[node_id] +1))
        return Q + U

    cdef int select_child(self, int node_id):
        cdef int child_id 
        cdef float current_child_puct = 0.0
        cdef float max_puct = -1e9
        cdef float sqrt_visit = sqrt(self.visits_counts[node_id])
        cdef int best_child_id = -1
        cdef int first_child_id = self.first_child_ids[node_id]
        cdef int last_child_id = first_child_id + self.childs_real_sizes[node_id]

        for child_id in range(first_child_id, last_child_id):
            current_child_puct = self.count_puct(child_id, sqrt_visit)
            if current_child_puct > max_puct:
                max_puct = current_child_puct
                best_child_id = child_id
        return best_child_id
            


    cdef void noise_root_policy(self):
        cdef double[:] noise
        cdef int root_childs_size 
        cdef int first_child_id 
        cdef int last_child_id 
        cdef int child_id
        cdef float policys_sum = 0.0
        cdef float policy_sum_reversed

        if not self.node_exists(self.root_id):
            self.generate_new_childs(self.root_id)

        root_childs_size = self.childs_real_sizes[self.root_id]
        first_child_id = self.first_child_ids[self.root_id]
        last_child_id = first_child_id + root_childs_size

        if self.node_empty(self.root_id):
            return 

        noise = self.rng.dirichlet(np.full(root_childs_size, self.dirichlet_alpha))

        for child_id in range(first_child_id, last_child_id):
            policys_sum += self.policys[child_id]

        if policys_sum != 0.0:
            policy_sum_reversed = 1 / policys_sum
        else:

            policy_sum_reversed = 0.0

        for child_id in range(first_child_id, last_child_id):
            self.policys[child_id] = self.policys[child_id] * (1 - self.dirichlet_eps) * policy_sum_reversed + noise[child_id - first_child_id] * self.dirichlet_eps

    cdef void fill_batch(self, int node_id, ):
        cdef int layer
        cdef int layer_pawn_translator[4]
        cdef int row
        cdef int col

        layer_pawn_translator[0] = MAN
        layer_pawn_translator[1] = KING
        layer_pawn_translator[2] = -MAN
        layer_pawn_translator[3] = -KING 


        for layer in range(STATE_TENSOR_SIZE):
            for row in range(BOARD_SIZE):
                for col in range(BOARD_SIZE):
                    if self.boards[node_id][row][col] == layer_pawn_translator[layer]:
                        self.uncut_batch[0][layer][row][col] = 1.0
                    else:
                        self.uncut_batch[0][layer][row][col] = 0.0


    cdef void generate_new_childs(self, int node_id):
        cdef int layout_id
        cdef int next_layouts_len = POSSIBLE_NEXT_MOVES_SIZE # in case id didnt_found possible
        cdef float leaf_value
        cdef float childs_policy
        cdef object valid_batch
        cdef int child_id
        cdef int policy_id
        cdef float[:,:] policy_view
        cdef float[:,:] value_view
        self.env.next_move(self.boards[node_id])
        self.env.get_next_states(self.possible_next_layouts, self.moves)
        self.env.generate_action_ids_and_counts(self.moves, self.action_counts, self.action_ids)

        for layout_id in range(POSSIBLE_NEXT_MOVES_SIZE):
            if self.possible_next_layouts[layout_id][0][0] == ILLEGAL_PAWN:
                next_layouts_len = layout_id
                break

        if self.new_node_id + next_layouts_len > self.max_nodes:
            raise MemoryError(f"MCTS tree is full: {self.new_node_id} nodes used, {next_layouts_len} more needed, max_nodes = {self.max_nodes}")

        self.childs_real_sizes[node_id] = 0 # create_node counts the children

        if next_layouts_len == 0:
            leaf_value = 1.0
            self.self_values[node_id] = leaf_value
            return

        self.fill_batch(node_id)
        valid_batch = np.asarray(self.uncut_batch)
        tensor_batch = torch.from_numpy(valid_batch)

        with torch.no_grad():
            policy, value = self.model(tensor_batch)

            policy_view = policy.cpu().numpy()
            value_view = value.cpu().numpy()

        self.self_values[node_id] = value_view[0][0]

        self.first_child_ids[node_id] = self.new_node_id # children get consecutive ids in the loop below
        for child_id in range(next_layouts_len):
            policy_id = self.action_ids[child_id]
            childs_policy = policy_view[0][policy_id]
            self.create_node(node_id, childs_policy, policy_id, self.possible_next_layouts[child_id])
            
    cdef void node_visit(self, int node_id, float new_value):
        self.visits_counts[node_id] += 1
        self.values_sum[node_id] += new_value

    cdef void generate_new_branches(self):
        cdef int iter
        cdef int limit = self.iteration_limit - self.visits_counts[self.root_id]
        cdef int current_node_id
        cdef int last_node_id
        cdef int next_node_id
        cdef int visit_node_id
        cdef int reversed_visit_node_id
        cdef int visited_nodes_iter
        cdef int[:] visited_nodes_ids = self.visited_nodes_ids
        cdef float leaf_value


        for iter in range(limit):
            current_node_id =  self.root_id
            visited_nodes_iter = 0

            while not self.node_empty(current_node_id) and self.node_exists(current_node_id):
                visited_nodes_ids[visited_nodes_iter] = current_node_id
                next_node_id = self.select_child(current_node_id)
                current_node_id = next_node_id
                visited_nodes_iter += 1
            
            last_node_id = current_node_id
            visited_nodes_ids[visited_nodes_iter] = last_node_id
            visited_nodes_iter += 1

            if self.node_empty(last_node_id):
                leaf_value = self.self_values[last_node_id] 

            elif not self.node_exists(last_node_id):
                self.generate_new_childs(last_node_id)
                leaf_value = self.self_values[last_node_id]

            
            for visit_node_id in range(visited_nodes_iter):
                reversed_visit_node_id = visited_nodes_iter - visit_node_id -1
                current_node_id = visited_nodes_ids[reversed_visit_node_id]
                self.node_visit(current_node_id, leaf_value)
                leaf_value = -leaf_value
            
    cdef int select_next_root(self, bint select_by_propability):
        cdef int child_id 
        cdef int best_root_child = -1
        cdef int root_id = self.root_id
        cdef int first_child_id = self.first_child_ids[root_id] 
        cdef int last_child_id = first_child_id + self.childs_real_sizes[root_id]
        cdef int max_visits_count = -1
        cdef int current_visits_count  
        cdef int visits_sum = 0
        cdef int random_visit

        for child_id in range(first_child_id, last_child_id):
            visits_sum += self.visits_counts[child_id]

        if select_by_propability and visits_sum > 0:
            random_visit = self.rng.integers(visits_sum)
            visits_sum = 0
            for child_id in range(first_child_id, last_child_id):
                visits_sum += self.visits_counts[child_id]
                if random_visit < visits_sum:
                    return child_id
        else: 
            for child_id in range(first_child_id, last_child_id):
                current_visits_count = self.visits_counts[child_id]
                if current_visits_count > max_visits_count:
                    max_visits_count = current_visits_count
                    best_root_child = child_id

        return best_root_child

    cdef void fill_package(self):
        cdef int package_id = self.current_package_id
        cdef int child_id
        cdef int root_id = self.root_id
        cdef int layer_pawn_translator[STATE_TENSOR_SIZE]
        cdef int layer
        cdef int row
        cdef int col
        cdef int action
        cdef float child_visits
        cdef float visits_to_move_count = 0.0
        cdef float visits_to_move_count_sum = 0.0 
        cdef int action_counts[ACTION_SPACE_SIZE]
        cdef int action_visits_sums[ACTION_SPACE_SIZE]

        if package_id >= MAX_GAME_PLIES:
            return

        layer_pawn_translator[0] = MAN
        layer_pawn_translator[1] = KING
        layer_pawn_translator[2] = -MAN
        layer_pawn_translator[3] = -KING

        self.expected_values_batch[package_id][0] = self.values_sum[root_id] / self.visits_counts[root_id]  # tutaj potencjalnie może być przypadek self.visit_counts = 0 
        
        for action in range(ACTION_SPACE_SIZE):
            action_counts[action] = 0
            action_visits_sums[action] = 0
            self.expected_policys_batch[package_id][action] = 0.0

        for child_id in range(self.first_child_ids[root_id], self.first_child_ids[root_id] + self.childs_real_sizes[root_id]):
            action_visits_sums[self.move_policys_id[child_id]] += self.visits_counts[child_id]
            action_counts[self.move_policys_id[child_id]] += 1

        for action in range(ACTION_SPACE_SIZE):
            if action_counts[action] > 0:
                visits_to_move_count = action_visits_sums[action] / action_counts[action]
                self.expected_policys_batch[package_id][action] = visits_to_move_count
                visits_to_move_count_sum += visits_to_move_count

        if visits_to_move_count_sum > 0.0:
            for action in range(ACTION_SPACE_SIZE):
                self.expected_policys_batch[package_id][action] = self.expected_policys_batch[package_id][action] / visits_to_move_count_sum 

        for layer in range(STATE_TENSOR_SIZE):
            for row in range(BOARD_SIZE):
                for col in range(BOARD_SIZE):
                    if self.boards[root_id][row][col] == layer_pawn_translator[layer]:
                        self.predictions_boards_batch[package_id][layer][row][col] = 1.0
                    else:
                        self.predictions_boards_batch[package_id][layer][row][col] = 0.0
        
        self.current_package_id += 1

    cdef void set_tie(self):
        cdef int last_package_id = self.current_package_id -1
        if self.current_package_id > 0:
            self.expected_values_batch[last_package_id][0] = 0.0
        
    cdef void set_lose(self):
        cdef int last_package_id = self.current_package_id -1
        if self.current_package_id > 0 :
            self.expected_values_batch[last_package_id][0] = -1.0
        

    cdef void self_play_episode(self):
        cdef bint select_by_propability
        cdef int next_root
        cdef int move = 0
        cdef CheckersEnv env = CheckersEnv()
    
        while True:
            self.noise_root_policy()
            self.generate_new_branches()
            if self.node_empty(self.root_id):
                self.set_lose()
                break
            self.fill_package()
            select_by_propability = (move < self.temperature_moves)
            next_root = self.select_next_root(select_by_propability)
            self.change_root(next_root)
            env.next_move(self.boards[self.root_id])
            if env.is_tie():
                self.set_tie()
                break
            move += 1

    cpdef get_packages(self):
        cdef int n = self.current_package_id
        self.self_play_episode()
        n = self.current_package_id

        return( np.asarray(self.predictions_boards_batch[:n]),
                np.asarray(self.expected_policys_batch[:n]),
                np.asarray(self.expected_values_batch[:n]))

