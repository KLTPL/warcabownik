import numpy as np
cimport numpy as np
import torch

from checkers_env cimport CheckersEnv
from libc.math cimport sqrt
from cpython.ref cimport PyObject, Py_INCREF, Py_DECREF
from libc.stdlib cimport malloc, free


cdef enum:
    EMPTY = 0
    MAN = 1
    KING = 2
    BOARD_SIZE = 8
    ILLEGAL_FIELD = -1
    POSSIBLE_NEXT_MOVES_SIZE = 128
    MOVES_SERIES_SIZE = 12
    MASK_SIZE = 1024
    ILLEGAL_MOVE = -1
    ILLEGAL_PAWN = -3
    KING_MOVES_SIZE = 4
    MAN_MOVES_SIZE = 2
    STATE_TENSOR_SIZE = 4
    BATCH_SIZE = 1
    ITERATION_LIMIT = 6

cdef float PUCT_CONST = 1.41

cdef class PersistenceMCTS:
    
    def __init__(self, int[:,:] board, object model):
        self.new_node_idx = 0
        self.env = CheckersEnv()
        self.env.next_move(board)
        self.env.get_board(board) # on purpose rotating board so the start is seems as opponent move 

        self.boards = np.full()
        self.move_policys_id = np.full()
        self.policys = np.full()
        self.values_sum = np.full()
        self.childs_real_sizes = np.full()
        self.self_values = np.full()
        self.childs_ids = np.full()
        self.visits_counts = np.full()


        self.mask = np.empty((MASK_SIZE), np.int32)
        self.possible_moves_mask_ids = np.empty((POSSIBLE_NEXT_MOVES_SIZE,), dtype=np.int32)
        self.moves = np.empty((POSSIBLE_NEXT_MOVES_SIZE, MOVES_SERIES_SIZE, 2), dtype=np.int32)
        self.possible_next_layouts = np.empty((POSSIBLE_NEXT_MOVES_SIZE, BOARD_SIZE, BOARD_SIZE), dtype=np.int32)
        self.uncut_batch = np.empty((1, STATE_TENSOR_SIZE, BOARD_SIZE, BOARD_SIZE), dtype=np.float32)

        self.model = model

        self.generate_new_branches()   
                   
    cdef void change_root(self, int node_id):
        self.root = self.root.get_child(node_id)


    cdef void copy_board(int[:,:] from_board, int[:,:] to_board):
        cdef int row
        cdef int col
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                to_board[row][col] = from_board[row][col]

    cdef bint node_exists(self,int node_id):
        return self.childs_real_sizes[node_id] >= 0

    cdef bint node_empty(self, int node_id):
        return self.childs_real_sizes[node_id] == 0

    cdef void create_node(self, float policy, int move_policy_id, int[:,:] board):
        cdef int created_node_id = self.new_node_id
        self.copy_board(board, self.boards[created_node_id])
        self.move_policys_id[created_node_id] = move_policy_id
        self.policys[created_node_id] = policy
        self.values_sums[created_node_id] = 0.0
        self.childs_real_sizes[created_node_id] = 0
        self.visits_counts[created_node_id] = 0
        self.new_node_id += 1

    cdef void generate_new_childs(self, int node_id):
        cdef int layout_id
        cdef int next_layouts_len = POSSIBLE_NEXT_MOVES_SIZE # in case id didnt_found possible
        cdef float leaf_value
        self.env.next_move(self.boards[node_id])
        self.env.get_next_states(self.possible_next_layouts, self.moves)

        for layout_id in range(POSSIBLE_NEXT_MOVES_SIZE):
            if self.possible_next_layouts[layout_id][0][0] == ILLEGAL_PAWN:
                next_layouts_len = layout_id
                break

        self.childs_real_sizes[node_id] = next_layouts_len

        if next_layouts_len == 0:
            leaf_value = -1.0
            self.self_values =leaf_value
        
        self.fill_batch()
        valid_batch = np.asarray(self.uncut_batch)
        tensor_batch



    cdef void node_visit(self, int node_id, float new_value):
        self.visits_counts[node_id] += 1
        self.values_sum[node_id] += new_value

    cdef void generate_new_branches(self):
        cdef int iter
        cdef int limit = ITERATION_LIMIT - self.root.get_visit_count()
        cdef int current_node_id 
        cdef int last_node_id 
        cdef int next_node_id
        cdef int visit_node_id
        cdef int reversed_visit_node_id
        cdef int visited_nodes_iter
        cdef int[:] visited_nodes_ids
        cdef float max_leaf_value[1]
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

            if self.node_empty(last_node_id):
                leaf_value = self.self_values(last_node_id)
            
            elif not self.node_exists(last_node_id):
                self.generate_new_childrens(last_node_id)
                leaf_value = self.self_values(last_node_id) 
            

            for visit_node_id in range(current_node_id):
                reversed_visit_node_id = current_node_id - visit_node_id - 1
                self.node_visit(current_node_id, leaf_value)
                leaf_value = -leaf_value

    def next_step(self, boards, expected_policies, expected_values):
        cdef object current_board_batch
        cdef object policies
        cdef object value
        
        current_board_batch = np.zeros((4,8,8), dtype = np.float32)
        policies = np.zeros((1024), dtype = np.float32)
        value = np.zeros((1), dtype = np.float32)

        
        self.root.fill_packages(current_board_batch, policies, value)

        boards.append(current_board_batch)
        expected_policies.append(policies)
        expected_values.append(value)

        if self.root.childs_real_size == 0:
            return False

        self.change_root(self.root.choose_best_child_id())
        self.generate_new_branches()
        return True



        

