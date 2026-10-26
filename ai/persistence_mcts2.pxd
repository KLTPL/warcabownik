from checkers_env cimport CheckersEnv

cdef enum:
    EMPTY = 0
    MAN = 1
    KING = 2
    BOARD_SIZE = 8
    ILLEGAL_FIELD = -1
    POSSIBLE_NEXT_MOVES_SIZE = 128
    MOVES_SERIES_SIZE = 12
    ACTION_SPACE_SIZE = 1024
    ILLEGAL_MOVE = -1
    ILLEGAL_PAWN = -3
    KING_MOVES_SIZE = 4
    MAN_MOVES_SIZE = 2
    STATE_TENSOR_SIZE = 4
    BATCH_SIZE = 1
    ITERATION_LIMIT = 6
    MAX_NODES = 3000000 # pojemność tablic drzewa
    MAX_GAME_PLIES = 512 # pojemność paczek treningowych jednej partii

cdef class PersistenceMCTS:
    cdef public CheckersEnv env
    cdef public object model

    cdef int root_id
    cdef int new_node_id

    # dane węzłów, indeksowane po node_id
    cdef int[:, :, :] boards
    cdef int[:] move_policys_id
    cdef float[:] policys
    cdef float[:] values_sum
    cdef int[:] childs_real_sizes
    cdef float[:] self_values
    cdef int[:] first_child_ids # children of a node are created one after another: first_child_ids[n] + i
    cdef int[:] visits_counts

    # bufory robocze
    cdef int[:] action_counts
    cdef int[:] action_ids
    cdef int[:, :, :] moves
    cdef int[:, :, :] possible_next_layouts
    cdef float[:, :, :, :] uncut_batch

    # paczki treningowe jednej partii, indeksowane po package_id
    cdef int current_package_id
    cdef float[:, :, :, :] predictions_boards_batch # (MAX_GAME_PLIES, STATE_TENSOR_SIZE, 8, 8)
    cdef float[:, :] expected_policys_batch # (MAX_GAME_PLIES, ACTION_SPACE_SIZE)
    cdef float[:, :] expected_values_batch # (MAX_GAME_PLIES, 1)

    cdef void change_root(self, int node_id)
    cdef void copy_board(self, int[:, :] from_board, int[:, :] to_board)
    cdef bint node_exists(self, int node_id)
    cdef bint node_empty(self, int node_id)
    cdef void create_root(self, int[:, :] board)
    cdef void create_node(self, int parent_id, float policy, int move_policy_id, int[:, :] board)
    cdef float count_puct(self, int node_id, float parent_sqrt_visits)
    cdef int select_child(self, int node_id)
    cdef void fill_batch(self, int node_id)
    cdef void generate_new_childs(self, int node_id)
    cdef void node_visit(self, int node_id, float new_value)
    cdef void generate_new_branches(self)
    cdef int select_next_root(self)
    cdef void fill_package(self)
    cdef void set_tie(self)
    cdef void set_lose(self)
    cdef void self_play_episode(self)
    cpdef get_packages(self)
