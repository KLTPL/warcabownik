

cdef float MAN_REWARD = 0.07
cdef float KING_REWARD = 0.12
cdef float PROMOTION_REWARD = 0.04
#the opponent checks are represented as negative Ones


cdef class CheckersEnv:
    def __init__(self):
        self._create_starting_state()
        self._create_cord_field_translators()
        
        
        self.MAN_MOVES[0][0] = -1
        self.MAN_MOVES[0][1] = 1
        self.MAN_MOVES[1][0] = -1
        self.MAN_MOVES[1][1] = -1

        self.KING_MOVES[0][0] = -1
        self.KING_MOVES[0][1] = 1
        self.KING_MOVES[1][0] = -1
        self.KING_MOVES[1][1] = -1
        self.KING_MOVES[2][0] = 1
        self.KING_MOVES[2][1] = 1
        self.KING_MOVES[3][0] = 1
        self.KING_MOVES[3][1] = -1
        
    cdef void _create_cord_field_translators(self):
        cdef int row
        cdef int col
        cdef int field = 0
        for row in range(8):
            for col in range(8):
                if (row % 2 ) +(col % 2 ) == 1:
                    self.cord_field_translator[row][col] = field
                    self.field_cord_translator[field][0] = row
                    self.field_cord_translator[field][1] = col
                    field += 1
                else:
                    self.cord_field_translator[row][col] = ILLEGAL_FIELD
    
    cdef void _create_starting_state(self):
        cdef int row
        cdef int col
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                if row <3:
                    if row%2 + col%2 == 1:
                        self.board[row][col] = -MAN
                    else:
                        self.board[row][col] = EMPTY
                elif row >=3 and row <5:
                    self.board[row][col] = EMPTY
                else:
                    if row%2 + col%2 == 1:
                        self.board[row][col] = MAN
                    else:
                        self.board[row][col] = EMPTY
        self.player = 1
        self.non_capture_counter = 0
        self._reset_layouts_history()
        

    cpdef void create_starting_state_py(self):
        self._create_starting_state()

    cdef int get_player(self):
        return self.player
    
    cdef void set_player(self, int new_player):
        if new_player == 1 or new_player == -1:
            self.player = new_player

    cdef void change_sites(self):
        cdef int row
        cdef int col
        for row in range(8):
            for col in range(8):
                self.board[row][col] = -self.board[row][col]

    cdef void rotate_board(self, bint keep_colours):
        cdef int row
        cdef int col
        cdef int first_check
        cdef int second_check
        for row in range(8):
            for col in range(4):
                first_check = self.board[row][col]
                second_check = self.board[BOARD_SIZE - 1 - row][BOARD_SIZE - 1 - col]
                if keep_colours:
                    self.board[row][col] = second_check
                    self.board[BOARD_SIZE -1 - row ][BOARD_SIZE -1 - col] = first_check
                else:
                    self.board[row][col] = -second_check
                    self.board[BOARD_SIZE -1 - row][BOARD_SIZE -1 - col] = -first_check

    cdef void get_board(self, int[:,:] copy_board_array):
        cdef int row
        cdef int col
        for row in range(8):
            for col in range(8):
                copy_board_array[row][col] = self.board[row][col]
    
    cpdef void get_board_py(self, int[:,:] copy_board_array):
        self.get_board(copy_board_array)

    cdef int count_val(self, int[:,:] layout, int val):
        cdef int row
        cdef int col
        cdef int counter = 0
        for row in range(8):
            for col in range(8):
                if layout[row][col] == val:
                    counter += 1
        return counter

    cdef float get_reward(self, int[:,:] next_layout):
        cdef int man_diff
        cdef int king_diff
        cdef int promotion_diff
        cdef float reward
        man_diff = self.count_val(self.board, -MAN) - self.count_val(next_layout, -MAN)
        king_diff = self.count_val(self.board, -KING) - self.count_val(next_layout, -KING)
        promotion_diff =self.count_val(next_layout, KING) - self.count_val(self.board, KING)
        
        reward = man_diff*MAN_REWARD + king_diff*KING_REWARD + promotion_diff*PROMOTION_REWARD
        return reward

    cdef bint was_captured(self, int[:,:] next_layout):
        cdef int man_diff
        cdef int king_diff
        man_diff = self.count_val(self.board, -MAN) - self.count_val(next_layout, -MAN)
        king_diff = self.count_val(self.board, -KING) - self.count_val(next_layout, -KING)

        return man_diff + king_diff > 0
    
    cdef bint is_tie(self):
        if self.position_repeats >= REPETITION_LIMIT:
            return True

        if self.non_capture_counter >= NON_CAPTURE_MOVES_LIMIT:
            return True

        return False
    
    cpdef bint is_tie_py(self):
        return self.is_tie()

    cdef bint was_man_moved(self, int[:,:] next_layout):
        cdef int row
        cdef int col
        for row in range(8):
            for col in range(8):
                if(next_layout[row][col] == MAN and self.board[row][col] != MAN) or (next_layout[row][col] != MAN and self.board[row][col] == MAN):
                    return True
        return False

    cdef void load_board(self, int[:,:] next_layout):
        cdef int row
        cdef int col
        for row in range(8):
            for col in range(8):
                self.board[row][col] = next_layout[row][col]

    cdef unsigned long long _hash_board(self):
        cdef unsigned long long hash_value = 14695981039346656037
        cdef unsigned long long fnv_prime = 1099511628211
        
        cdef int row, col
        cdef int piece
        
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                piece = self.board[row][col]
                
                hash_value = hash_value ^ <unsigned long long>piece
                hash_value = hash_value * fnv_prime
                
        return hash_value

    cdef void _reset_layouts_history(self):
        # history starts with the current position
        self.layouts_hashes_len = 0
        self._push_layout_hash()

    cdef void _push_layout_hash(self):
        cdef unsigned long long current_hash = self._hash_board()
        cdef int last_id = self.layouts_hashes_len
        cdef int history_id
        cdef int repeats = 1

        if last_id >= LAYOUTS_HISTORY_SIZE: # only after NON_CAPTURE_MOVES_LIMIT plies, the game is already a tie then
            return

        self.layouts_hashes[last_id] = current_hash
        self.layouts_hashes_len += 1

        # same player to move and reachable position only every REPETITION_STEP plies
        history_id = last_id - REPETITION_STEP
        while history_id >= 0:
            if self.layouts_hashes[history_id] == current_hash:
                repeats += 1
            history_id -= REPETITION_STEP

        self.position_repeats = repeats
        
    cpdef void next_move_py(self, int[:,:] new_board):
        self.next_move(new_board)
    
    cdef void next_move(self, int[:,:] new_board):
        cdef bint irreversible = self.was_captured(new_board) or self.was_man_moved(new_board)
        if irreversible:
            self.non_capture_counter = 0
        else:
            self.non_capture_counter += 1

        self.load_board(new_board)
        self.rotate_board(False)
        self.player *= -1

        if irreversible: # positions from before a capture / man move can never occur again
            self._reset_layouts_history()
        else:
            self._push_layout_hash()

    cdef bint moves_empty(self, int[:,:,:] moves):
        return moves[0][0][0] == ILLEGAL_FIELD

    cdef void generate_mask_and_action_ids(self, int [:,:,:] moves, int[:] mask, int[:] legal_actions_mask_ids): 
        cdef int id
        cdef int legal_actions_mask_ids_iterator = 0
        cdef int move_id
        cdef int from_field
        cdef int to_field =0
        cdef int current_to_field
        cdef int updated_mask_id

        for id in range(MASK_SIZE):
            mask[id] = 0
        for id in range(POSSIBLE_NEXT_MOVES_SIZE):
            legal_actions_mask_ids[id] = ILLEGAL_MOVE

        if not self.moves_empty(moves):
            for id in range(POSSIBLE_NEXT_MOVES_SIZE):
                from_field = moves[id][0][FROM_FIELD_ID]
                
                if from_field == ILLEGAL_FIELD:
                    break

                for move_id in range(MOVES_SERIES_SIZE):
                    current_to_field = moves[id][move_id][TO_FIELD_ID]
                    if current_to_field == ILLEGAL_FIELD:
                        break
                    to_field = current_to_field
                
                updated_mask_id = from_field *32 + to_field
                mask[updated_mask_id] = 1
                legal_actions_mask_ids[legal_actions_mask_ids_iterator] = updated_mask_id
                legal_actions_mask_ids_iterator += 1

    cdef void fill_possible_next_layouts_and_moves(self, int [:,:,:] possible_next_layouts, int [:,:,:] moves):
        cdef int layout
        cdef int row
        cdef int col
        cdef int move

        for layout in range(POSSIBLE_NEXT_MOVES_SIZE):
            for row in range(BOARD_SIZE):
                for col in range(BOARD_SIZE):
                    possible_next_layouts[layout][row][col] = ILLEGAL_PAWN
            for move in range(MOVES_SERIES_SIZE):
                moves[layout][move][FROM_FIELD_ID] = ILLEGAL_FIELD
                moves[layout][move][TO_FIELD_ID] = ILLEGAL_FIELD

    cdef bint possible_next_layouts_empty(self, int[:,:,:] possible_next_layouts):
        return possible_next_layouts[0][0][0] == ILLEGAL_PAWN

    cdef void get_next_states(self, int [:,:,:] possible_next_layouts, int [:,:,:] moves):
        self.fill_possible_next_layouts_and_moves(possible_next_layouts, moves)
        
        self._get_capture_states(possible_next_layouts, moves)
        
        if self.possible_next_layouts_empty(possible_next_layouts):
            self._get_normal_states(possible_next_layouts, moves) # the non capturing moves has lower priority in English/American checks 

    cdef void copy_captured_mask(self, bint [:,:] captured_mask, bint [:,:] captured_mask_copy):
        cdef int row
        cdef int col
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                captured_mask_copy[row][col] = captured_mask[row][col]


    cdef void add_moves(self,int[:] cord,int[:] move, int[:] returned_cord):
        returned_cord[0] = cord[0] + move[0]
        returned_cord[1] = cord[1] + move[1]
    
    cdef bint _is_cord_on_board(self, int[:] cord):
        return cord[0]<BOARD_SIZE and cord[0]>=0 and cord[1]<BOARD_SIZE and cord[1]>=0
    
    cdef bint _is_field_empty(self, int[:] cord):
        if self._is_cord_on_board(cord):
            return self.board[cord[0]][cord[1]]==EMPTY
        else:
            return False

    cdef bint _is_cord_last_field(self, int[:] cord):
        return cord[0] == 0

    cdef bint _is_piece_opponent(self, int[:] cord):
        if self._is_cord_on_board(cord):
            return self.board[cord[0]][cord[1]]<0
        else:
            return False
        
    cdef void _apply_captured_mask(self, bint[:,:] captured_mask, int[:,:] board_to_apply):
        cdef int row
        cdef int col

        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                if not captured_mask[row][col]:
                    board_to_apply[row][col] = EMPTY
                else:
                    board_to_apply[row][col] = self.board[row][col]
        
    cdef void _king_capture_moves_recursive(self, int row, int col, bint check_moved, int[:] current_layout_id, int current_move_id , bint[:,:] captured_mask, int[:,:,:] possible_next_layouts, int[:,:,:] moves):
        cdef bint able_to_move=False
        cdef int move[2]
        cdef int mid_cord[2]
        cdef int cord[2]
        cdef int jump[2]
        cdef int jump_cord[2]
        cdef int move_id
        cdef int first_layout_id
        cdef int layout_id
        cord[0] = row
        cord[1] = col
        for move_id in range(KING_MOVES_SIZE):
            move[0] = self.KING_MOVES[move_id][0]
            move[1] = self.KING_MOVES[move_id][1]
            jump[0] = move[0]*2
            jump[1] = move[1]*2
            self.add_moves(cord, move, mid_cord)
            self.add_moves(cord, jump, jump_cord)

            if self._is_piece_opponent(mid_cord) and self._is_field_empty(jump_cord) and self._is_cord_on_board(jump_cord) and captured_mask[mid_cord[0]][mid_cord[1]]: # checks if its possible to beat opponent check
                captured_mask[mid_cord[0]][mid_cord[1]] = False
                able_to_move=True

                first_layout_id = current_layout_id[0] # layouts created in this branch share this jump
                self._king_capture_moves_recursive(jump_cord[0], jump_cord[1], True, current_layout_id, current_move_id+1, captured_mask, possible_next_layouts, moves) # tutaj może być błąd z captured mask

                for layout_id in range(first_layout_id, min(current_layout_id[0], POSSIBLE_NEXT_MOVES_SIZE)):
                    moves[layout_id][current_move_id][FROM_FIELD_ID] = self.cord_field_translator[cord[0]][cord[1]]
                    moves[layout_id][current_move_id][TO_FIELD_ID] = self.cord_field_translator[jump_cord[0]][jump_cord[1]]
                captured_mask[mid_cord[0]][mid_cord[1]] = True

        if not able_to_move and check_moved:
            self._apply_captured_mask(captured_mask, possible_next_layouts[current_layout_id[0]])
            possible_next_layouts[current_layout_id[0]][row][col] = KING
            
            current_layout_id[0] += 1

    cdef void _king_classic_moves(self, int row, int col, int[:] current_board_id, int[:,:,:] possible_board_layouts, int[:,:,:] moves):
        cdef int cord[2]
        cdef int move[2]
        cdef int new_cord[2]
        cdef int move_id
        cord[0]=row
        cord[1]=col
        for move_id in range(KING_MOVES_SIZE):
            move[0] = self.KING_MOVES[move_id][0]
            move[1] = self.KING_MOVES[move_id][1]
            self.add_moves(cord, move, new_cord)
            if self._is_field_empty(new_cord) and self._is_cord_on_board(new_cord):
                self._apply_normal_move(cord, new_cord, KING, possible_board_layouts[current_board_id[0]], moves[current_board_id[0]])
                current_board_id[0] += 1

    cdef void _apply_normal_move(self, int[:] from_cord, int[:] to_cord, int check, int[:,:] next_layout, int[:,:] moves):
        cdef int row
        cdef int col
        cdef int cord[2]
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                cord[0] = row
                cord[1] = col
                if row == from_cord[0] and col == from_cord[1]:
                    next_layout[row][col] = EMPTY
                elif row == to_cord[0] and col == to_cord[1]:
                    if self._is_cord_last_field(cord) and check == MAN:
                        next_layout[row][col] = KING
                    else:
                        next_layout[row][col] = check
                else:
                    next_layout[row][col] = self.board[row][col]
        moves[0][FROM_FIELD_ID] = self.cord_field_translator[from_cord[0]][from_cord[1]]
        moves[0][TO_FIELD_ID] = self.cord_field_translator[to_cord[0]][to_cord[1]]

        

    cdef void _man_classic_moves(self, int row, int col, int[:] current_board_id, int[:,:,:] possible_board_layouts, int[:,:,:] moves):
        cdef int cord[2]
        cdef int move[2]
        cdef int new_cord[2]
        cdef int move_id
        cord[0]=row
        cord[1]=col
        for move_id in range(MAN_MOVES_SIZE):
            move[0] = self.MAN_MOVES[move_id][0]
            move[1] = self.MAN_MOVES[move_id][1]
            self.add_moves(cord, move, new_cord)
            if self._is_field_empty(new_cord) and self._is_cord_on_board(new_cord):
                self._apply_normal_move(cord, new_cord, MAN, possible_board_layouts[current_board_id[0]], moves[current_board_id[0]])
                current_board_id[0] += 1

    cdef void _man_capture_moves_recursive(self, int row, int col, bint check_moved, int[:] current_layout_id, int current_move_id , bint[:,:] captured_mask, int[:,:,:] possible_next_layouts, int[:,:,:] moves):
        cdef bint able_to_move=False
        cdef int move[2]
        cdef int mid_cord[2]
        cdef int cord[2]
        cdef int jump[2]
        cdef int jump_cord[2]
        cdef int move_id
        cdef int first_layout_id
        cdef int layout_id
        cord[0]=row
        cord[1]=col
        for move_id in range(MAN_MOVES_SIZE):
            move[0] = self.MAN_MOVES[move_id][0]
            move[1] = self.MAN_MOVES[move_id][1]
            jump[0] = move[0]*2
            jump[1] = move[1]*2
            self.add_moves(cord, move, mid_cord)
            self.add_moves(cord, jump, jump_cord)

            if self._is_piece_opponent(mid_cord) and self._is_field_empty(jump_cord) and self._is_cord_on_board(jump_cord) and captured_mask[mid_cord[0]][mid_cord[1]]: # checks if its possible to beat opponent check
                captured_mask[mid_cord[0]][mid_cord[1]] = False
                able_to_move=True

                first_layout_id = current_layout_id[0] # layouts created in this branch share this jump
                self._man_capture_moves_recursive(jump_cord[0], jump_cord[1], True, current_layout_id, current_move_id+1, captured_mask, possible_next_layouts, moves) # tutaj może być błąd z captured mask

                for layout_id in range(first_layout_id, min(current_layout_id[0], POSSIBLE_NEXT_MOVES_SIZE)):
                    moves[layout_id][current_move_id][FROM_FIELD_ID] = self.cord_field_translator[cord[0]][cord[1]]
                    moves[layout_id][current_move_id][TO_FIELD_ID] = self.cord_field_translator[jump_cord[0]][jump_cord[1]]
                captured_mask[mid_cord[0]][mid_cord[1]] = True

        if not able_to_move and check_moved:
            self._apply_captured_mask(captured_mask, possible_next_layouts[current_layout_id[0]])
            if self._is_cord_last_field(cord):
                possible_next_layouts[current_layout_id[0]][row][col] = KING
            else:
                possible_next_layouts[current_layout_id[0]][row][col] = MAN
            current_layout_id[0] += 1

        
    cdef void _get_normal_states(self, int[:,:,:] possible_board_layouts, int[:,:,:] moves):
        cdef int current_layout_id[1]
        cdef int row
        cdef int col
        current_layout_id[0] = 0

        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                if self.board[row][col] == MAN:
                    self._man_classic_moves(row, col, current_layout_id, possible_board_layouts, moves)
                elif self.board[row][col] == KING:
                    self._king_classic_moves(row, col, current_layout_id, possible_board_layouts, moves)
                
                
    cdef void fill_captured_mask(self, bint[:,:] captured_mask):
        cdef int row
        cdef int col
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                captured_mask[row][col] = True
        
    cdef void _get_capture_states(self, int[:,:,:] possible_next_layouts, int [:,:,:] moves):
        cdef int row
        cdef int col
        cdef int current_layout_id[1]
        cdef bint empty_mask[8][8]
        cdef bint [:,:]current_captured_mask = empty_mask
        self.fill_captured_mask(current_captured_mask)
        current_layout_id[0] = 0


        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                if self.board[row][col] == MAN:
                    self.board[row][col] = EMPTY 
                    self.fill_captured_mask(current_captured_mask)
                    self._man_capture_moves_recursive(row, col, False, current_layout_id, 0, current_captured_mask, possible_next_layouts, moves)
                    self.board[row][col] = MAN

                elif self.board[row][col] == KING:
                    self.board[row][col] = EMPTY
                    self.fill_captured_mask(current_captured_mask)
                    self._king_capture_moves_recursive(row, col, False, current_layout_id, 0, current_captured_mask, possible_next_layouts, moves)
                    self.board[row][col] = KING
    
    cdef void print_board(self):
        cdef int r, c, field_val
        cdef str row_str
        
        print("  0 1 2 3 4 5 6 7")
        print(" -----------------")
        
        for r in range(BOARD_SIZE):
            row_str = f"{r}|"
            for c in range(BOARD_SIZE):
                
                if self.player == -1:
                    field_val = -self.board[BOARD_SIZE - 1 - r][BOARD_SIZE - 1 - c]
                else:
                    field_val = self.board[r][c]
                
                if field_val == EMPTY:
                    row_str += ". "
                elif field_val == MAN:
                    row_str += "w "
                elif field_val == KING:
                    row_str += "W "
                elif field_val == -MAN:
                    row_str += "b "
                elif field_val == -KING:
                    row_str += "B "
                else:
                    row_str += "? " 
                    
            print(row_str)
        print()

    cpdef void print_board_py(self):
        self.print_board()
