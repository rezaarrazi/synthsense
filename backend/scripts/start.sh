#!/bin/bash
set -e

echo "🚀 Starting SynthSense Backend..."

# Run the startup script (migrations, seeding, etc.)
echo "📋 Running startup tasks..."
uv run python scripts/startup.py

# Start the FastAPI server
echo "🎯 Starting FastAPI server..."
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
