# Warcabownik AI model

## ⚙️ Project setup

### Create an .env file in the ai directory

```env
FRONTEND_URL=http://localhost:5731
```

### Running localy

```
python3 -m venv venv

# Linux/Mac:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

pip install fastapi uvicorn pydantic

uvicorn main:app --reload --port 5000
```

### Test the API

```
curl -X 'POST' \
  'http://localhost:5000/predict-move' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "player_id": 2,
  "board": [
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [2, 0, 2, 0, 2, 0, 2, 0],
    [0, 2, 0, 2, 0, 2, 0, 2],
    [2, 0, 2, 0, 2, 0, 2, 0]
  ]
}'
```
