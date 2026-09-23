import torch
import random
import time
import numpy as np

# UWAGA: Podmień te importy na nazwy swoich plików/klas!
from CheckersEnv import CheckersEnv
from Model import CheckersValueNet, prepare_layout_for_network

# 1. WYMUSZENIE CPU DLA KOMPUTERA LOKALNEGO
DEVICE = torch.device("cpu")

# 2. LOKALNA ŚCIEŻKA DO MODELU (zakładamy, że plik leży w tym samym folderze)
MODEL_PATH = "checkers_model.pth" 

def get_bot_move(model, possible_layouts):
    """Zwraca najlepszy układ planszy według sieci neuronowej."""
    tensor_layout_list = [prepare_layout_for_network(layout) for layout in possible_layouts]
    batch_tensor = torch.stack(tensor_layout_list).to(DEVICE)

    with torch.no_grad():
        values_prediction = model(batch_tensor).squeeze(-1)
        best_idx = torch.argmax(values_prediction).item()

    return possible_layouts[best_idx]

def test_bot_vs_random(model, num_games=100):
    """Test statystyczny: Bot (Białe) vs Losowe Ruchy (Czarne)."""
    print(f"\n[TEST STATYSTYCZNY] Rozpoczynam {num_games} gier: Bot vs Małpa...")
    
    bot_wins = 0
    random_wins = 0
    ties = 0
    
    for episode in range(1, num_games + 1):
        env = CheckersEnv()
        env.create_starting_state()
        history_len = 0
        
        while True:
            possible_layouts = env.get_next_states()
            
            # Brak ruchów = koniec gry
            if len(possible_layouts) == 0:
                if history_len % 2 == 1:
                    bot_wins += 1
                else:
                    random_wins += 1
                break
                
            # Limit ruchów = remis
            if history_len >= 150:
                ties += 1
                break
                
            is_bot_turn = (history_len % 2 == 0)
            
            if is_bot_turn:
                best_layout = get_bot_move(model, possible_layouts)
            else:
                best_layout = random.choice(possible_layouts)
                
            # Środowisko samo obraca teraz planszę wewnątrz funkcji next_move!
            env.next_move(best_layout)
            history_len += 1
            
        if episode % 10 == 0:
            print(f"Rozegrano {episode}/{num_games}...")

    print("-" * 30)
    print("WYNIKI TESTU STATYSTYCZNEGO:")
    print(f"Wygrane Bota:   {bot_wins}")
    print(f"Wygrane Losowe: {random_wins}")
    print(f"Remisy:         {ties}")
    if num_games - ties > 0:
        winrate = (bot_wins / (num_games - ties)) * 100
        print(f"Winrate (bez remisów): {winrate:.1f}%")
    print("-" * 30)

def watch_bot_vs_bot(model, delay=1.0, epsilon=0.0):
    """Wizualizacja meczu AI vs AI bez udziału losowości."""
    print("\n[WIDOWISKO] Rozpoczynam mecz Bot vs Bot!")
    env = CheckersEnv()
    env.create_starting_state()
    history_len = 0
    
    while True:
        # UWAGA WIZUALNA: Ponieważ plansza teraz fizycznie się obraca co turę,
        # w konsoli zawsze będziesz widział planszę z perspektywy gracza,
        # który ma właśnie wykonać ruch (jego pionki będą na dole).
        env.print_board() 
        print(f"Ruch numer: {history_len + 1}")
        print("-" * 20)
        time.sleep(delay)
        
        possible_layouts = env.get_next_states()
        
        if len(possible_layouts) == 0:
            if history_len % 2 == 1:
                print("Koniec Gry! Wygrały Białe (Gracz 1).")
            else:
                print("Koniec Gry! Wygrały Czarne (Gracz 2).")
            break
            
        if history_len >= 150:
            print("Koniec Gry! Remis (przekroczono 150 ruchów).")
            break
            
        if random.random() < epsilon:
            best_layout = random.choice(possible_layouts)
        else:
            best_layout = get_bot_move(model, possible_layouts)
            
        env.next_move(best_layout)
        history_len += 1

if __name__ == "__main__":
    print(f"Urządzenie testowe: {DEVICE}")
    
    model = CheckersValueNet().to(DEVICE)
    
    try:
        # KRYTYCZNE: map_location=DEVICE tłumaczy z GPU (Kaggle) na CPU (Lokalnie)
        model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE, weights_only=True))
        print("Model wczytany poprawnie!")
    except FileNotFoundError:
        print(f"BŁĄD: Nie znaleziono pliku modelu: {MODEL_PATH}")
        print("Upewnij się, że pobrałeś plik z Kaggle i wrzuciłeś do tego samego folderu!")
        exit()
        
    model.eval()
    
    # Odkomentuj to, co chcesz uruchomić:
    test_bot_vs_random(model, num_games=100)
    watch_bot_vs_bot(model, delay=1.0, epsilon=0.0)