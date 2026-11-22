#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

echo "=== Starting CodeLens Local Development Services ==="

# Check virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r backend/requirements.txt
else
    source venv/bin/activate
fi

# Run migrations
cd backend
python manage.py migrate --noinput
python manage.py collectstatic --noinput || true

# Seed if empty
python ../scripts/seed_demo.py

echo "Starting Django API Server on http://localhost:8000..."
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

echo "Starting Vite Frontend on http://localhost:3000..."
cd ../frontend
npm run dev -- --port 3000 &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
