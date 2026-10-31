from checkers_env cimport CheckersEnv
from cpython.ref cimport PyObject

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

cdef class Node:
    cdef public int [:,:] board
    cdef public int visit_count
    cdef public int move_policy_id
    cdef public float policy
    cdef public float values_sum
    cdef public int childs_real_size
    # Surowa tablica wskaźników do obiektów Pythona!
    cdef PyObject** childs 
    cdef public float self_value
    
    cdef void create_board(self, int[:,:] board)
    cdef void visit(self, float value)
    cdef int get_visit_count(self)
    cdef int get_move_policy_id(self)
    cdef float get_policy(self)
    cdef bint empty(self)
    cdef bint visited(self)
    cdef float get_values_mean(self)
    cdef float puct_counting(self, float sqrt_parent_visit_count)
    cdef int choose_best_child_id(self)
    cdef Node get_child(self, int id)
    cdef Node select_child(self)
    cdef void fill_current_board_batch(self, float[:,:,:] current_board_batch)
    cdef void fill_batch(self, float[:,:,:,:] uncut_batch)
    cdef void generate_new_childs(self, float[:,:,:,:] uncut_batch, int[:,:,:] possible_next_layouts, int[:,:,:] moves, int[:] mask, int[:] possible_moves_mask_ids, CheckersEnv env, object model, float[:] leaf_value)
    cdef void fill_packages(self, float[:,:,:] board_batch, float[:] policy, float[:] value)

cdef class PersistenceMCTS:
    cdef public Node root
    cdef public CheckersEnv env 
    cdef int[:] mask
    cdef int[:] possible_moves_mask_ids            # Zmienione na memoryview
    cdef int[:, :, :] moves                        # Zmienione na memoryview
    cdef int[:, :, :] possible_next_layouts        # Zmienione na memoryview
    cdef float[:, :, :, :] uncut_batch
    cdef public object model
    
    cdef void change_root(self, int node_id)
    cdef void generate_new_branches(self)