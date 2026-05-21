#!/bin/bash
set -e

echo ""
echo "  wardrobe.ai"
echo "  ─────────────────────────────────"
echo ""

# Check .env
if [ ! -f "backend/.env" ]; then
  if [ -f "backend/.env.example" ]; then
    cp backend/.env.example backend/.env
  fi
  echo "  ⚠️  No backend/.env found."
  echo "  Open backend/.env and add your API keys, then run ./start.sh again."
  echo ""
  echo "  You need:"
  echo "    ANTHROPIC_API_KEY  → https://console.anthropic.com"
  echo "    OPENWEATHER_API_KEY → https://openweathermap.org/api (free tier)"
  echo ""
  exit 1
fi

# Check API keys are filled in
if grep -q "your_anthropic_api_key_here" backend/.env; then
  echo "  ⚠️  Please fill in your ANTHROPIC_API_KEY in backend/.env"
  exit 1
fi

if grep -q "your_openweathermap_api_key_here" backend/.env; then
  echo "  ⚠️  Please fill in your OPENWEATHER_API_KEY in backend/.env"
  exit 1
fi

# Python venv
if [ ! -d "backend/venv" ]; then
  echo "  Setting up Python environment..."
  python3 -m venv backend/venv
fi

echo "  Installing Python dependencies..."
backend/venv/bin/pip install -r backend/requirements.txt -q

# Node modules
if [ ! -d "frontend/node_modules" ]; then
  echo "  Installing Node dependencies..."
  cd frontend && npm install --silent && cd ..
fi

echo ""
echo "  Starting servers..."
echo ""

# Start backend (subshell so cd doesn't affect this script)
(cd backend && ../backend/venv/bin/uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

# Give backend a moment to start
sleep 1

# Start frontend (subshell so cd doesn't affect this script)
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "  ✓ wardrobe.ai is running"
echo ""
echo "    App    → http://localhost:5173"
echo "    API    → http://localhost:8000"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

cleanup() {
  echo ""
  echo "  Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}

trap cleanup INT TERM
wait
