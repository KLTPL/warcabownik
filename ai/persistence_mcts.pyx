import numpy as np
cimport numpy as np
import torch

from checkers_env cimport CheckersEnv
from libc.math cimport sqrt
from cpython.ref cimport PyObject, Py_INCREF, Py_DECREF
from libc.stdlib cimport malloc, free

cdef float PUCT_CONST = 1.41
cdef class Node:
    def __cinit__(self):
        self.childs = <PyObject**>malloc(POSSIBLE_NEXT_MOVES_SIZE * sizeof(PyObject*))
        cdef int i
        for i in range(POSSIBLE_NEXT_MOVES_SIZE):
            self.childs[i] = NULL

    def __dealloc__(self):
        cdef int i
        if self.childs is not NULL:
            for i in range(self.childs_real_size):
                if self.childs[i] is not NULL:
                    Py_DECREF(<object>self.childs[i])
            free(self.childs)

    def __init__(self, float policy, int move_policy_id, int[:,:] board):
        self.visit_count = 0
        self.values_sum = 0.0
        self.policy = policy
        self.move_policy_id = move_policy_id
        self.self_value = 0.0
        self.create_board(board)
        
    cdef void create_board(self, int[:,:] board):
        self.board = np.empty((8,8), dtype = np.int32)
        cdef int row
        cdef int col
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                self.board[row][col] = board[row][col]

    cdef void visit(self, float value):
        self.visit_count += 1
        self.values_sum += value
    
    cdef int get_visit_count(self):
        return self.visit_count
    
    cdef int get_move_policy_id(self):
        return self.move_policy_id

    cdef float get_policy(self):
        return self.policy

    cdef bint empty(self):
        return self.childs_real_size == 0
    
    cdef bint visited(self):
        return self.visit_count != 0

    cdef float get_values_mean(self):
        if self.visit_count == 0:
            return 0.0
        else:
            return self.values_sum / self.visit_count

    cdef float puct_counting(self, float sqrt_parent_visit_count):
        cdef float Q
        cdef float U
        if self.empty():
            Q = 0.0
        else:
            Q = self.values_sum / self.visit_count
        
        U = PUCT_CONST * self.policy * sqrt_parent_visit_count /  (self.visit_count + 1)

        return Q + U  
    
    cdef int choose_best_child_id(self):
        cdef int child_id
        cdef int best_child_id = 0
        cdef int max_visit_count = -1
        cdef int current_visit_count
        cdef Node current_child

        for child_id in range(self.childs_real_size):
            current_child = <Node>(self.childs[child_id])
            current_visit_count = current_child.get_visit_count()
            if current_visit_count > max_visit_count:
                max_visit_count = current_visit_count
                best_child_id = child_id

        return best_child_id


    cdef Node get_child(self, int id):
        if id >= self.childs_real_size or id < 0:
            raise ValueError("childs id out of range")
     
        return <Node>(self.childs[id])

    cdef Node select_child(self):
        cdef int child_id
        cdef float max_puct = -9999999.0
        cdef int max_child_id = 0
        cdef float sqrt_visit_count   # to do zmiany
        cdef float current_node_puct
        cdef Node current_child
        

        if self.childs_real_size == 0:
            return None
        
        sqrt_visit_count = sqrt(<float>self.visit_count)

        for child_id in range(self.childs_real_size):
            current_child = <Node>(self.childs[child_id])
            current_node_puct = current_child.puct_counting(sqrt_visit_count)
            if current_node_puct > max_puct:
                max_child_id = child_id
                max_puct = current_node_puct

        return <Node>(self.childs[max_child_id])

    cdef void fill_current_board_batch(self, float[:,:,:] current_board_batch):
        cdef int batch_id
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
                    if self.board[row][col] == layer_pawn_translator[layer]:
                        current_board_batch[layer][row][col] = 1.0
                    else:
                        current_board_batch[layer][row][col] = 0.0

    cdef void fill_batch(self, float[:,:,:,:] uncut_batch):
        self.fill_current_board_batch(uncut_batch[0])
            
    cdef void generate_new_childs(self, float[:,:,:,:] uncut_batch, int[:,:,:] possible_next_layouts, int[:,:,:] moves, int[:] mask, int[:] possible_moves_mask_ids, CheckersEnv env, object model, float[:] leaf_value):
        cdef int next_layouts_size
        cdef int policy_id
        cdef int child_id
        cdef bint next_layouts_full = True
        cdef float childs_value
        cdef float childs_policy
        cdef float[:,:] policy_view
        cdef float[:,:] value_view
        cdef object valid_batch
        cdef object tensor_batch
        cdef object policy
        cdef object value
        cdef Node new_node

        env.next_move(self.board) # obraca planszę aby była z perspektywy przeciwnika
        env.get_next_states(possible_next_layouts, moves) #loaded possible moves and layouts
        env.generate_mask_and_action_ids(moves, mask, possible_moves_mask_ids)
        
        for next_layouts_size in range(POSSIBLE_NEXT_MOVES_SIZE):
            if possible_next_layouts[next_layouts_size][0][0] == ILLEGAL_PAWN:
                next_layouts_full = False
                break

        if next_layouts_full:
            next_layouts_size = POSSIBLE_NEXT_MOVES_SIZE

        if env.possible_next_layouts_empty(possible_next_layouts):
            self.childs_real_size = 0
            leaf_value[0] = -1.0
            self.self_value = leaf_value[0]
            return

        self.fill_batch(uncut_batch)
        valid_batch = np.asarray(uncut_batch)
        tensor_batch = torch.from_numpy(valid_batch)

        with torch.no_grad():
            policy, value = model(tensor_batch)

            policy_view = policy.cpu().numpy()
            value_view = value.cpu().numpy()
        
        self.childs_real_size = next_layouts_size

        leaf_value[0] = value_view[0][0]
        self.self_value = leaf_value[0]
        for child_id in range(next_layouts_size):
            policy_id = possible_moves_mask_ids[child_id]
            childs_policy = policy_view[0][policy_id]
            new_node = Node(childs_policy, policy_id, possible_next_layouts[child_id])
            Py_INCREF(new_node)
            self.childs[child_id] = <PyObject*>new_node

    cdef void fill_packages(self,float[:,:,:] board_batch,float[:] policy, float[:] value):
        cdef int child_id
        cdef int total_childs_visit=0
        cdef Node current_child

        self.fill_current_board_batch(board_batch)

        value[0] = self.get_values_mean()
        
        for child_id in range(self.childs_real_size):
            current_child = <Node>(self.childs[child_id])
            total_childs_visit += current_child.get_visit_count()

        for child_id in range(self.childs_real_size):
            current_child = <Node>(self.childs[child_id])
            policy[current_child.get_move_policy_id()] = current_child.get_visit_count() / total_childs_visit
        









cdef class PersistenceMCTS:
    
    def __init__(self, int[:,:] board, object model):
        self.env = CheckersEnv()
        self.env.next_move(board)
        self.env.get_board(board) # on purpose rotating board so the start is seems as opponent move 

        self.root = Node(0.0, -1, board)

        self.mask = np.empty((MASK_SIZE), np.int32)
        self.possible_moves_mask_ids = np.empty((POSSIBLE_NEXT_MOVES_SIZE,), dtype=np.int32)
        self.moves = np.empty((POSSIBLE_NEXT_MOVES_SIZE, MOVES_SERIES_SIZE, 2), dtype=np.int32)
        self.possible_next_layouts = np.empty((POSSIBLE_NEXT_MOVES_SIZE, BOARD_SIZE, BOARD_SIZE), dtype=np.int32)
        self.uncut_batch = np.empty((1, STATE_TENSOR_SIZE, BOARD_SIZE, BOARD_SIZE), dtype=np.float32)

        self.model = model

        self.generate_new_branches()   
        

    cdef void change_root(self, int node_id):
        self.root = self.root.get_child(node_id)

    cdef void generate_new_branches(self):
        cdef int iter
        cdef int limit = ITERATION_LIMIT - self.root.get_visit_count()
        cdef int current_node_id 
        cdef int visit_node_id
        cdef int reversed_visit_node_id
        cdef Node current_node
        cdef float max_leaf_value[1]
        cdef float leaf_value
        cdef PyObject* visited_nodes[ITERATION_LIMIT]

        for iter in range(limit):
            current_node =  self.root
            current_node_id = 0

            while not current_node.empty() and current_node.visited():
                visited_nodes[current_node_id] = <PyObject*>current_node
                current_node = current_node.select_child()
                current_node_id += 1
            
            visited_nodes[current_node_id] = <PyObject*>current_node
            current_node_id += 1

            if current_node.visited():
                leaf_value = current_node.self_value
            else:    
                current_node.generate_new_childs(self.uncut_batch, self.possible_next_layouts, self.moves, self.mask, self.possible_moves_mask_ids, self.env, self.model, max_leaf_value)
                leaf_value = max_leaf_value[0]

            for visit_node_id in range(current_node_id):
                reversed_visit_node_id = current_node_id - visit_node_id - 1
                (<Node>visited_nodes[reversed_visit_node_id]).visit(leaf_value)
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



        

