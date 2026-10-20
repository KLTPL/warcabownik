cdef enum:
    EMPTY = 0
    MAN = 1
    KING = 2
    BOARD_SIZE = 8
    ILLEGAL_FIELD = -1
    NON_CAPTURE_MOVES_LIMIT = 80
    ALL_POSSIBLE_FIELDS_SIZE = 32
    CORD_ARRAY_SIZE = 2
    LAYOUTS_HISTORY_SIZE = 81 # NON_CAPTURE_MOVES_LIMIT + 1, positions since the last capture / man move
    REPETITION_STEP = 4 # a position can only repeat after a multiple of 4 plies
    REPETITION_LIMIT = 3
    POSSIBLE_NEXT_MOVES_SIZE = 128
    MOVES_SERIES_SIZE = 12
    FROM_FIELD_ID = 0
    TO_FIELD_ID = 1
    MASK_SIZE = 1024
    ILLEGAL_MOVE = -1
    ILLEGAL_PAWN = -3
    KING_MOVES_SIZE = 4
    MAN_MOVES_SIZE = 2
    STATE_TENSOR_SIZE = 4
    BATCH_SIZE = 1

cdef class CheckersEnv:
    cdef public int cord_field_translator[BOARD_SIZE][BOARD_SIZE]
    cdef public int field_cord_translator[ALL_POSSIBLE_FIELDS_SIZE][CORD_ARRAY_SIZE]
    cdef int board[8][8]
    cdef public int player
    cdef public int non_capture_counter
    cdef unsigned long long layouts_hashes[LAYOUTS_HISTORY_SIZE]
    cdef public int layouts_hashes_len
    cdef public int position_repeats
    cdef int MAN_MOVES[MAN_MOVES_SIZE][CORD_ARRAY_SIZE]
    cdef int KING_MOVES[KING_MOVES_SIZE][CORD_ARRAY_SIZE]

    cdef void _create_cord_field_translators(self)
    cdef void _create_starting_state(self)
    cpdef void create_starting_state_py(self)
    cdef int get_player(self)
    cdef void set_player(self, int new_player)
    cdef void change_sites(self)
    cdef void rotate_board(self, bint keep_colours)
    cdef void get_board(self, int[:,:] copy_board_array)
    cpdef void get_board_py(self, int[:,:] copy_board_array)
    cdef int count_val(self, int[:,:] layout, int val)
    cdef float get_reward(self, int[:,:] next_layout)
    cdef bint was_captured(self, int[:,:] next_layout)
    cdef bint is_tie(self)
    
    cpdef bint is_tie_py(self)

    cdef bint was_man_moved(self, int[:,:] next_layout)
    cdef void load_board(self, int[:,:] next_layout)
    cdef unsigned long long _hash_board(self)
    cdef void _reset_layouts_history(self)
    cdef void _push_layout_hash(self)
    
    cpdef void next_move_py(self, int[:,:] new_board)
    cdef void next_move(self, int[:,:] new_board)

    cdef bint moves_empty(self, int[:,:,:] moves)
    cdef void generate_mask_and_action_ids(self, int[:,:,:] moves, int[:] mask, int[:] legal_actions_mask_ids)
    cdef void fill_possible_next_layouts_and_moves(self, int[:,:,:] possible_next_layouts, int[:,:,:] moves)
    cdef bint possible_next_layouts_empty(self, int[:,:,:] possible_next_layouts)
    cdef void get_next_states(self, int[:,:,:] possible_next_layouts, int[:,:,:] moves)

    cdef void copy_captured_mask(self, bint[:,:] captured_mask, bint[:,:] captured_mask_copy)
    cdef void add_moves(self, int[:] cord, int[:] move, int[:] returned_cord)
    cdef bint _is_cord_on_board(self, int[:] cord)
    cdef bint _is_field_empty(self, int[:] cord)
    cdef bint _is_cord_last_field(self, int[:] cord)
    cdef bint _is_piece_opponent(self, int[:] cord)
    cdef void _apply_captured_mask(self, bint[:,:] captured_mask, int[:,:] board_to_apply)

    cdef void _king_capture_moves_recursive(self, int row, int col, bint check_moved, int[:] current_layout_id, int current_move_id, bint[:,:] captured_mask, int[:,:,:] possible_next_layouts, int[:,:,:] moves)
    cdef void _king_classic_moves(self, int row, int col, int[:] current_board_id, int[:,:,:] possible_board_layouts, int[:,:,:] moves)
    cdef void _apply_normal_move(self, int[:] from_cord, int[:] to_cord, int check, int[:,:] next_layout, int[:,:] moves)
    cdef void _man_classic_moves(self, int row, int col, int[:] current_board_id, int[:,:,:] possible_board_layouts, int[:,:,:] moves)
    cdef void _man_capture_moves_recursive(self, int row, int col, bint check_moved, int[:] current_layout_id, int current_move_id, bint[:,:] captured_mask, int[:,:,:] possible_next_layouts, int[:,:,:] moves)

    cdef void _get_normal_states(self, int[:,:,:] possible_board_layouts, int[:,:,:] moves)
    cdef void fill_captured_mask(self, bint[:,:] captured_mask)
    cdef void _get_capture_states(self, int[:,:,:] possible_next_layouts, int[:,:,:] moves)
    cdef void print_board(self)
    cpdef void print_board_py(self)