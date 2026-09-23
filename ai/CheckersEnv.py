import numpy as np

# Constants (Clean Code)
EMPTY = 0
MAN = 1
KING = 2
BOARD_SIZE = 8

MAN_REWARD = 0.07
KING_REWARD = 0.12
PROMOTION_REWARD = 0.04
#the opponent checks are represented as negative Ones

class CheckersEnv:
    def __init__(self):
        self.player = None
        self.board = None
        self.create_starting_state()
        

    def create_starting_state(self):
        self.player = 1
        self.board = np.array([
            [EMPTY, -MAN,EMPTY, -MAN,EMPTY, -MAN,EMPTY, -MAN],
            [ -MAN,EMPTY, -MAN,EMPTY, -MAN,EMPTY, -MAN,EMPTY],
            [EMPTY, -MAN,EMPTY, -MAN,EMPTY, -MAN,EMPTY, -MAN],
            [EMPTY,EMPTY,EMPTY,EMPTY,EMPTY,EMPTY,EMPTY,EMPTY],
            [EMPTY,EMPTY,EMPTY,EMPTY,EMPTY,EMPTY,EMPTY,EMPTY],
            [  MAN,EMPTY,  MAN,EMPTY,  MAN,EMPTY,  MAN,EMPTY],
            [EMPTY,  MAN,EMPTY,  MAN,EMPTY,  MAN,EMPTY,  MAN],
            [  MAN,EMPTY,  MAN,EMPTY,  MAN,EMPTY,  MAN,EMPTY]
        ])


    def get_player(self):
        return self.player
    
    def set_player(self, new_player):
        if new_player in (-1, 1):
            self.player = new_player
        else:
            raise ValueError("Player value should be 1 or -1")
    def change_sites(self):
        self.board = self.board.copy() * -1
    def rotate_board(self, keep_colours=False):
        if keep_colours:
            self.board = self.board[::-1, ::-1].copy()
        else:
            self.board = self.board[::-1, ::-1].copy() * -1

    def get_board(self):
        return self.board.copy()
    
    def get_reward(self, next_layout):
        MAN_DIFF = np.count_nonzero(self.board == -MAN) - np.count_nonzero(next_layout == -MAN)
        KING_DIFF = np.count_nonzero(self.board == -KING) - np.count_nonzero(next_layout == -KING)
        PROMOTION_DIFF = np.count_nonzero(next_layout == KING) - np.count_nonzero(self.board == KING)
        
        reward = MAN_DIFF*MAN_REWARD + KING_DIFF*KING_REWARD + PROMOTION_DIFF*PROMOTION_REWARD
        return reward
        
    def next_move(self, new_board):
        self.board = new_board
        self.rotate_board()
        self.player *= -1

    def load_board(self, new_board):
        self.board = new_board


    def get_next_states(self, collect_moves=False):
        possible_board_layouts = self._get_capture_states(collect_moves=collect_moves)
        
        if len(possible_board_layouts) == 0:
            possible_board_layouts = self._get_normal_states(collect_moves=collect_moves) # the non capturing moves has lower priority in English/American checks 

        return possible_board_layouts

    def add_moves(self, cord, move):
        return cord[0]+move[0], cord[1]+move[1]
    
    def _is_cord_on_board(self, cord):
        x, y = cord
        return x<BOARD_SIZE and x>=0 and y<BOARD_SIZE and y>=0
    
    def _is_field_empty(self, cord):
        try:
            return self.board[cord]==EMPTY
        except IndexError:
            return False

    def _is_cord_last_field(self, cord):
        row, col = cord 
        return row == 0

    def _is_piece_opponent(self, cord):
        try:
            return self.board[cord]<0
        except IndexError:
            return False
        
    def _apply_captured_mask(self, captured_mask):
        board = self.board.copy()
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                cord = row,col
                if not captured_mask[cord]:
                    board[cord]=EMPTY
        return board
        
    def _king_capture_moves_recursive(self, cord, board_layouts=None, captured_mask=None, collect_moves=False, collected_moves_list=None ):
        able_to_move=False
        first_move = False

        if captured_mask is None:
            captured_mask = np.full((BOARD_SIZE,BOARD_SIZE),True)
            first_move = True

        if board_layouts is None:
            board_layouts = []
        
        if collect_moves and collected_moves_list is None:
            collected_moves_list=[]
            
        for move in ((-1,-1),(-1, 1),(1,-1),(1, 1)):
            jump = (move[0]*2,move[1]*2)
            mid_cord=self.add_moves(cord, move)
            jump_cord = self.add_moves(cord, jump)
            if self._is_piece_opponent(mid_cord) and self._is_field_empty(jump_cord) and self._is_cord_on_board(jump_cord) and captured_mask[mid_cord]: # checks if its possible to beat opponent check
                captured_mask[mid_cord] = False
                able_to_move=True
                collected_moves_list_copy = None
                if collect_moves:
                    collected_moves_list_copy = collected_moves_list.copy()
                    move_dict = {
                        "fromPosition": cord,
                        "toPosition": jump_cord
                    }
                    collected_moves_list_copy.append(move_dict)

                self._king_capture_moves_recursive(jump_cord, board_layouts=board_layouts, captured_mask=captured_mask.copy(),
                                                  collect_moves=collect_moves, collected_moves_list=collected_moves_list_copy)
                captured_mask[mid_cord] = True

        if not able_to_move and not first_move:
            final_board = self._apply_captured_mask(captured_mask) # important is that when recursive function is called then the field on standing pawn is changed to empty
            final_board[cord] = KING
            if not collect_moves:
                board_layouts.append(final_board)
            else:
                board_moves_package = {
                    "board": final_board,
                    "moves": collected_moves_list
                }
                board_layouts.append(board_moves_package)

        return board_layouts
    
    def _king_classic_moves(self,cord, collect_moves=False):
        board_layouts = []
        
        
        board_layouts = []
        for move in ((-1,-1),(-1, 1),(1,-1),(1, 1)):
            new_cord=self.add_moves(cord, move)
            if self._is_field_empty(new_cord) and self._is_cord_on_board(new_cord):
                current_board = self.board.copy()
                current_board[cord] = EMPTY
                current_board[new_cord] = KING
                if not collect_moves:
                    board_layouts.append(current_board)
                else:
                    move_dict={
                        "fromPosition": cord,
                        "toPosition":new_cord
                    }
                    collected_moves_list = []
                    collected_moves_list.append(move_dict)
                    board_moves_package = {
                        "board": current_board,
                        "moves": collected_moves_list
                    }
                    board_layouts.append(board_moves_package)
        return board_layouts

    def _man_classic_moves(self, cord, collect_moves=False):
        board_layouts = []
        

        for move in ((-1,-1),(-1, 1)):
            new_cord=self.add_moves(cord, move)
            if self._is_field_empty(new_cord) and self._is_cord_on_board(new_cord):
                current_board = self.board.copy()
                current_board[cord] = EMPTY
                current_board[new_cord] = KING if self._is_cord_last_field(new_cord) else MAN
                if not collect_moves:
                    board_layouts.append(current_board)
                else:
                    move_dict={
                        "fromPosition": cord,
                        "toPosition":new_cord
                    }
                    collected_moves_list = []
                    collected_moves_list.append(move_dict)
                    board_moves_package = {
                        "board": current_board,
                        "moves": collected_moves_list
                    }
                    board_layouts.append(board_moves_package)
        return board_layouts

    def _man_capture_move_recursive(self, cord, board_layouts=None, captured_mask=None, collect_moves=False, collected_moves_list=None):
        able_to_move=False
        first_move = False
        if captured_mask is None:
            captured_mask = np.full((BOARD_SIZE,BOARD_SIZE),True)
            first_move = True

        
        if board_layouts is None:
            board_layouts = []

        if collect_moves and collected_moves_list is None:
            collected_moves_list=[]

        for move in ((-1,-1),(-1, 1)):
            jump = (move[0]*2,move[1]*2)
            mid_cord = self.add_moves(cord, move)
            jump_cord = self.add_moves(cord, jump)
            if self._is_piece_opponent(mid_cord) and self._is_field_empty(jump_cord) and self._is_cord_on_board(jump_cord) and captured_mask[mid_cord]: # checks if its possible to beat opponent check
                captured_mask[mid_cord] = False
                able_to_move=True
                collected_moves_list_copy = None
                if collect_moves:
                    collected_moves_list_copy = collected_moves_list.copy()
                    move_dict = {
                        "fromPosition": cord,
                        "toPosition": jump_cord
                    }
                    collected_moves_list_copy.append(move_dict)
                self._man_capture_move_recursive(jump_cord, board_layouts=board_layouts, captured_mask=captured_mask.copy(),
                                                  collect_moves=collect_moves, collected_moves_list=collected_moves_list_copy)
                captured_mask[mid_cord] = True

        if not able_to_move and not first_move:
            final_board = self._apply_captured_mask(captured_mask) # important is that when recursive function is called then the field on standing pawn is changed to empty
            final_board[cord] = KING if self._is_cord_last_field(cord) else MAN
            if not collect_moves:
                board_layouts.append(final_board)
            else:
                board_moves_package = {
                    "board": final_board,
                    "moves": collected_moves_list
                }
                board_layouts.append(board_moves_package)

        return board_layouts
        
    def _get_normal_states(self, collect_moves=False):
        possible_board_layouts = [] 

        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                cord = row,col
                returned_layouts = [] 
                if self.board[cord] == MAN:
                    returned_layouts = self._man_classic_moves(cord, collect_moves=collect_moves)
                elif self.board[cord] == KING:
                    returned_layouts = self._king_classic_moves(cord, collect_moves=collect_moves)

                possible_board_layouts.extend(returned_layouts)
                
                
        return possible_board_layouts

    def _get_capture_states(self, collect_moves=False):
        possible_board_layouts = [] 
        
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                cord = row,col
                returned_layouts = [] 
                if self.board[cord] == MAN:
                    self.board[cord] = EMPTY 
                    returned_layouts = self._man_capture_move_recursive(cord, collect_moves=collect_moves)
                    self.board[cord] = MAN
                elif self.board[cord] == KING:
                    self.board[cord] = EMPTY
                    returned_layouts = self._king_capture_moves_recursive(cord, collect_moves=collect_moves)
                    self.board[cord] = KING

                possible_board_layouts.extend(returned_layouts)

        return possible_board_layouts

    

    def print_board(self, state=None):
        """Prints the board in a readable format from a fixed perspective."""
        if state is None:
            state = self.board
            
        
        display_state = state.copy()
        
        
        if getattr(self, 'player', 1) == -1:
            display_state = state[::-1, ::-1] * -1

        symbols = {EMPTY: '.', MAN: 'w', KING: 'W', -MAN: 'b', -KING: 'B'}
        print("  0 1 2 3 4 5 6 7")
        print(" -----------------")
        for r in range(BOARD_SIZE):
            row_str = f"{r}|"
            for c in range(BOARD_SIZE):
                field_val = int(display_state[r, c])
                row_str += symbols[field_val] + " "
            print(row_str)
        print()
