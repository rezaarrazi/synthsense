# SynthSense Backend

FastAPI backend for the SynthSense synthetic consumer research platform.

## Features

- FastAPI web framework
- GraphQL API with Strawberry
- PostgreSQL database with SQLAlchemy
- JWT authentication
- LangChain/LangGraph AI services
- Docker support

## Development

```bash
# Install dependencies
uv sync

# Run database migrations
uv run alembic upgrade head

# Start development server
uv run uvicorn app.main:app --reload
```

## API Documentation

- REST API: http://localhost:8000/docs
- GraphQL Playground: http://localhost:8000/graphql