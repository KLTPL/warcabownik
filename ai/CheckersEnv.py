import numpy as np

# Constants (Clean Code)
EMPTY = 0
MAN = 1
KING = 2
BOARD_SIZE = 8
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
        
    def rotate_board(self):
        self.board = self.board[::-1, ::-1].copy() * -1

    def get_board(self):
        return self.board
    
    def next_move(self, new_board):
        self.board = new_board
        self.rotate_board
        self.player *= -1

    def load_board(self, new_board):
        self.board = new_board


    def get_next_states(self):
        possible_board_layouts = self._get_capture_states()
        
        if len(possible_board_layouts) == 0:
            possible_board_layouts = self._get_normal_states() # the non capturing moves has lower priority in English/American checks 

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
        
    def _king_capture_moves_recursive(self, cord, board_layouts=None, captured_mask=None ):
        able_to_move=False
        first_move = False

        if captured_mask is None:
            captured_mask = np.full((BOARD_SIZE,BOARD_SIZE),True)
            first_move = True
        if board_layouts is None:
            board_layouts=[]
            
        for move in ((-1,-1),(-1, 1),(1,-1),(1, 1)):
            jump = (move[0]*2,move[1]*2)
            mid_cord=self.add_moves(cord, move)
            jump_cord = self.add_moves(cord, jump)
            if self._is_piece_opponent(mid_cord) and self._is_field_empty(jump_cord) and self._is_cord_on_board(jump_cord) and captured_mask[mid_cord]: # checks if its possible to beat opponent check
                captured_mask[mid_cord] = False
                able_to_move=True
                self._king_capture_moves_recursive(jump_cord, board_layouts, captured_mask.copy())
                captured_mask[mid_cord] = True

        if not able_to_move and not first_move:
            final_board = self._apply_captured_mask(captured_mask) # important is that when recursive function is called then the field on standing pawn is changed to empty
            final_board[cord] = KING
            board_layouts.append(final_board)
        return board_layouts
    
    def _king_classic_moves(self,cord):
        board_layouts = []
        for move in ((-1,-1),(-1, 1),(1,-1),(1, 1)):
            new_cord=self.add_moves(cord, move)
            if self._is_field_empty(new_cord) and self._is_cord_on_board(new_cord):
                current_board = self.board.copy()
                current_board[cord] = EMPTY
                current_board[new_cord] = KING
                board_layouts.append(current_board)
        return board_layouts

    def _man_classic_moves(self, cord):
        board_layouts = []
        for move in ((-1,-1),(-1, 1)):
            new_cord=self.add_moves(cord, move)
            if self._is_field_empty(new_cord) and self._is_cord_on_board(new_cord):
                current_board = self.board.copy()
                current_board[cord] = EMPTY
                current_board[new_cord] = KING if self._is_cord_last_field(new_cord) else MAN
                board_layouts.append(current_board)
        return board_layouts

    def _man_capture_move_recursive(self, cord, board_layouts=None, captured_mask=None ):
        able_to_move=False
        first_move = False
        if captured_mask is None:
            captured_mask = np.full((BOARD_SIZE,BOARD_SIZE),True)
            first_move = True
        if board_layouts is None:
            board_layouts = []

        for move in ((-1,-1),(-1, 1)):
            jump = (move[0]*2,move[1]*2)
            mid_cord = self.add_moves(cord, move)
            jump_cord = self.add_moves(cord, jump)
            if self._is_piece_opponent(mid_cord) and self._is_field_empty(jump_cord) and self._is_cord_on_board(jump_cord) and captured_mask[mid_cord]: # checks if its possible to beat opponent check
                captured_mask[mid_cord] = False
                able_to_move=True
                self._man_capture_move_recursive(jump_cord, board_layouts, captured_mask.copy())
                captured_mask[mid_cord] = True

        if not able_to_move and not first_move:
            final_board = self._apply_captured_mask(captured_mask) # important is that when recursive function is called then the field on standing pawn is changed to empty
            final_board[cord] = KING if self._is_cord_last_field(cord) else MAN
            board_layouts.append(final_board)
        return board_layouts
        
    
    def _get_normal_states(self):
        possible_board_layouts=[]
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                cord = row,col
                if self.board[cord] == MAN:
                    possible_board_layouts.extend(self._man_classic_moves(cord))
                elif self.board[cord] == KING:
                    possible_board_layouts.extend(self._king_classic_moves(cord))
        return possible_board_layouts

    def _get_capture_states(self):
        possible_board_layouts=[]
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                cord = row,col
                if self.board[cord] == MAN:
                    self.board[cord] = EMPTY 
                    possible_board_layouts.extend(self._man_capture_move_recursive(cord))
                    self.board[cord] = MAN
                elif self.board[cord] == KING:
                    self.board[cord] = EMPTY
                    possible_board_layouts.extend(self._king_capture_moves_recursive(cord))
                    self.board[cord] = KING
        return possible_board_layouts

    

    def print_board(self, state=None):
        """Prints the board in a readable format."""
        if state is None:
            state = self.board
            
        symbols = {EMPTY: '.', MAN: 'w', KING: 'W', -MAN: 'b', -KING: 'B'}
        print("  0 1 2 3 4 5 6 7")
        print(" -----------------")
        for r in range(BOARD_SIZE):
            row_str = f"{r}|"
            for c in range(BOARD_SIZE):
                row_str += symbols[state[r, c]] + " "
            print(row_str)
        print()

