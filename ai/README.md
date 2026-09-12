# Warcabownik AI model

## ⚙️ Project setup

### Running localy

```
python3 -m venv venv

# Linux/Mac:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

pip install fastapi uvicorn pydantic

uvicorn main:app --reload --port 8000
```

### Test the API

```
curl -X 'POST' \
  'http://localhost:8000/predict-move' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "player_id": 2,
  "board": [
    [0, 2, 0, 2, 0, 2, 0, 2],
    [2, 0, 2, 0, 2, 0, 2, 0],
    [0, 2, 0, 2, 0, 2, 0, 2],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0]
  ]
}'
```
