# wardrobe.ai

A personal outfit planning app. Upload your clothes, track style inspo, and get daily outfit suggestions based on the weather and how you're feeling.

## Features

- **My Wardrobe** — Upload photos of your clothes. Claude auto-tags each item (type, color, fit, formality, season). Edit tags manually.
- **Get Dressed** — Pick a mood, enter your city, and get outfit suggestions pulled from your wardrobe based on weather + vibe.
- **Inspo Board** — Upload Pinterest screenshots or any inspo photos. Claude detects clothing items in each image. If the same type of item shows up 3+ times, it flags it as a capsule wardrobe gap.

## Prerequisites

You need two API keys (both have free tiers):

1. **Anthropic API key** — for Claude vision (auto-tagging + inspo analysis)
   Get one at [console.anthropic.com](https://console.anthropic.com)

2. **OpenWeatherMap API key** — for weather in the Get Dressed tab
   Get one at [openweathermap.org/api](https://openweathermap.org/api) (free tier works)

You also need **Python 3.10+** and **Node.js 18+** installed.

## Setup

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd wardrobe-ai

# 2. Add your API keys
cp backend/.env.example backend/.env
# Open backend/.env and fill in both keys

# 3. Run
chmod +x start.sh
./start.sh
```

The app opens at **http://localhost:5173**

The `start.sh` script automatically:
- Creates a Python virtual environment
- Installs Python and Node dependencies
- Starts both servers

## Manual start (if needed)

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** (separate terminal):
```bash
cd frontend
npm install
npm run dev
```

## Project structure

```
wardrobe-ai/
├── backend/
│   ├── main.py          # FastAPI app + all routes
│   ├── models.py        # SQLite database models
│   ├── database.py      # SQLAlchemy setup
│   ├── ai.py            # Claude vision functions
│   ├── weather.py       # OpenWeatherMap integration
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── Wardrobe.jsx
│           ├── GetDressed.jsx
│           └── Inspo.jsx
├── start.sh
└── .gitignore           # excludes .env, uploads/, database, node_modules
```

## Notes

- Your uploaded images and database are stored locally in `backend/uploads/` and `backend/wardrobe.db` — both are gitignored so they stay on your machine only.
- The app is personal use only — there's no authentication.
