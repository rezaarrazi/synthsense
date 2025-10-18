# SynthSense Backend

Backend API for SynthSense - Synthetic Consumer Research Platform.

## Features

- FastAPI with async PostgreSQL
- Strawberry GraphQL API
- LangChain/LangGraph for AI operations
- JWT Authentication
- Docker support

## Development

```bash
# Install dependencies
uv sync

# Run development server
uv run uvicorn app.main:app --reload

# Run database migrations
uv run alembic upgrade head
```
