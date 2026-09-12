import numpy as np

# Constants (Clean Code)
EMPTY = 0
MAN = 1
KING = 2

class CheckersEnv:
    def __init__(self):
        self.board = self.create_starting_board()
        self.current_player = 1  # 1 (White/Bottom), -1 (Black/Top)

    def create_starting_board(self):
        """Creates a standard 8x8 checkers board."""
        board = np.zeros((8, 8), dtype=np.int8)
        
        # Black pieces at the top (-1)
        for r in range(3):
            for c in range(8):
                if (r + c) % 2 != 0:
                    board[r, c] = -MAN
                    
        # White pieces at the bottom (1)
        for r in range(5, 8):
            for c in range(8):
                if (r + c) % 2 != 0:
                    board[r, c] = MAN
                    
        return board

    def get_next_states(self, state, player):
        """
        MAIN FUNCTION FOR THE ML MODEL (After-States).
        Returns a list of board states (NumPy arrays) after executing all legal moves.
        """
        # 1. Conversion to Canonical State (We always play with 'positive' pieces from bottom to top)
        canonical_state = state.copy() if player == 1 else state[::-1, ::-1] * -1

        # 2. Find moves (forced captures first, then normal moves)
        next_canonical_states = self._get_capture_states(canonical_state)
        
        if len(next_canonical_states) == 0:
            next_canonical_states = self._get_normal_states(canonical_state)

        # 3. Revert the generated boards back to the true game perspective
        final_states = []
        for canonical_next in next_canonical_states:
            absolute_state = canonical_next if player == 1 else canonical_next[::-1, ::-1] * -1
            final_states.append(absolute_state)

        return final_states

    # ==========================================
    # INTERNAL LOGIC (For positive pieces only)
    # ==========================================

    def _get_normal_states(self, state):
        """Generates board states after normal, non-capturing moves."""
        next_states = []
        for r in range(8):
            for c in range(8):
                piece = state[r, c]
                if piece <= 0:
                    continue  # Ignore empty squares and enemy pieces

                # Directions: Man (2 diagonals up), King (all 4 diagonals)
                dirs = [(-1, -1), (-1, 1)] if piece == MAN else [(-1, -1), (-1, 1), (1, -1), (1, 1)]
                
                for dr, dc in dirs:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < 8 and 0 <= nc < 8 and state[nr, nc] == EMPTY:
                        # Create a new future state
                        new_state = state.copy()
                        new_state[r, c] = EMPTY
                        
                        # Pawn promotion to King
                        if piece == MAN and nr == 0:
                            new_state[nr, nc] = KING
                        else:
                            new_state[nr, nc] = piece
                            
                        next_states.append(new_state)
        return next_states

    def _get_capture_states(self, state):
        """Triggers recursive search for multi-jumps (captures) for each of our pieces."""
        capture_states = []
        for r in range(8):
            for c in range(8):
                piece = state[r, c]
                if piece > 0:
                    # Function returns ready boards with completed jump sequences
                    states = self._find_captures_recursive(state, r, c, piece, captured=set())
                    capture_states.extend(states)
        return capture_states

    def _find_captures_recursive(self, state, r, c, piece, captured):
        """The magic of multi-jumps: recursively builds states after a series of jumps."""
        found_jump = False
        final_states = []
        
        dirs = [(-1, -1), (-1, 1)] if piece == MAN else [(-1, -1), (-1, 1), (1, -1), (1, 1)]

        for dr, dc in dirs:
            enemy_r, enemy_c = r + dr, c + dc
            land_r, land_c = r + 2*dr, c + 2*dc

            if 0 <= land_r < 8 and 0 <= land_c < 8:
                # 1. Is there an enemy? 2. Have we not captured it yet in this sequence?
                if state[enemy_r, enemy_c] < 0 and (enemy_r, enemy_c) not in captured:
                    # Are we landing on an empty square (or the starting square from before the jump)?
                    if state[land_r, land_c] == EMPTY or (land_r, land_c) == (r, c):
                        found_jump = True
                        
                        # Copy the state for this jump branch
                        new_state = state.copy()
                        new_state[r, c] = EMPTY
                        
                        new_captured = captured.copy()
                        new_captured.add((enemy_r, enemy_c))
                        
                        # Pawn promotion stops the jump sequence immediately
                        is_promoted = (piece == MAN and land_r == 0)
                        
                        if is_promoted:
                            new_state[land_r, land_c] = KING
                            # Remove all captured enemies and finish
                            for cr, cc in new_captured:
                                new_state[cr, cc] = EMPTY
                            final_states.append(new_state)
                        else:
                            # Move the piece and search further recursively
                            new_state[land_r, land_c] = piece
                            deeper_states = self._find_captures_recursive(new_state, land_r, land_c, piece, new_captured)
                            final_states.extend(deeper_states)

        # If there are no more jumps from here and we collected something -> Save the result
        if not found_jump and len(captured) > 0:
            clean_state = state.copy()
            # Only at the end of the turn (Turkish rule) do we remove all captured pieces
            for cr, cc in captured:
                clean_state[cr, cc] = EMPTY
            final_states.append(clean_state)

        return final_states

    def print_board(self, state=None):
        """Prints the board in a readable format."""
        if state is None:
            state = self.board
            
        symbols = {EMPTY: '.', MAN: 'w', KING: 'W', -MAN: 'b', -KING: 'B'}
        print("  0 1 2 3 4 5 6 7")
        print(" -----------------")
        for r in range(8):
            row_str = f"{r}|"
            for c in range(8):
                row_str += symbols[state[r, c]] + " "
            print(row_str)
        print()
import random
import time
def run_branching_tree_test():
    env = CheckersEnv()
    
    print("\n" + "="*50)
    print("TEST: DRZEWO ROZWIDLEŃ (WSZYSTKIE MOŻLIWE WĘŻYKI)")
    print("="*50)
    
    board = np.zeros((8, 8), dtype=np.int8)
    board[6, 4] = MAN    # Nasz biały pion na dole
    
    # Przeciwnicy ustawieni w "drzewko decyzyjne"
    board[5, 3] = -MAN
    board[5, 5] = -MAN
    
    board[3, 1] = -MAN
    board[3, 3] = -MAN
    board[3, 5] = -MAN
    
    board[1, 3] = -MAN
    board[1, 5] = -MAN

    print("POZYCJA STARTOWA:")
    print("Nasz pion na (6,4) wchodzi w las przeciwników.")
    print("Przy każdym skoku ma do wyboru lewą lub prawą stronę!")
    env.print_board(board)
    
    # Generujemy przyszłości
    states = env.get_next_states(board, player=1)
    
    print(f"🔥 Silnik znalazł dokładnie {len(states)} całkowicie różnych końcowych plansz!")
    print("Oto wszystkie wygenerowane After-States do oceny przez model:\n")
    
    for i, st in enumerate(states):
        print(f"Opcja wężyka {i+1}:")
        env.print_board(st)

if __name__ == "__main__":
    run_branching_tree_test()