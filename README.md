# SynthSense - Synthetic Consumer Research Platform

A modern web application for conducting AI-powered consumer research using synthetic personas. Built with FastAPI, GraphQL, PostgreSQL, and React.

## 🚀 Features

- **AI-Powered Simulations**: Run consumer research experiments using LangChain/LangGraph
- **Synthetic Personas**: Generate custom persona cohorts or use pre-built ones
- **GraphQL API**: Modern API with both GraphQL and REST endpoints
- **Real-time Chat**: Chat with personas to get deeper insights
- **JWT Authentication**: Secure email/password authentication
- **Docker Support**: Easy deployment with Docker Compose

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   (PostgreSQL)  │
│   Apollo Client │    │   GraphQL/REST  │    │   Alembic       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   AI Services   │
                       │   LangChain     │
                       │   LangGraph     │
                       └─────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **Strawberry GraphQL**: GraphQL implementation
- **SQLAlchemy**: ORM with async support
- **Alembic**: Database migrations
- **LangChain/LangGraph**: AI workflow management
- **PostgreSQL**: Primary database
- **JWT**: Authentication
- **uv**: Python package management
- **pytest**: Testing framework with integration tests

### Frontend
- **React**: UI framework
- **Apollo Client**: GraphQL client
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Vite**: Build tool

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-service orchestration
- **Nginx**: Frontend serving

## 📦 Installation

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)
- uv (Python package manager)

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd synthsense
   ```

2. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp backend/env.example backend/.env
   ```
   
   Edit `backend/.env` with your configuration:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:password@postgres:5432/synthsense
   JWT_SECRET=your-secret-key-change-in-production
   OPENAI_API_KEY=sk-your-openai-key-here   # Add your API key
   GEMINI_API_KEY=your-gemini-key-here      # Add your API key
   LLM_PROVIDER=openai                      # or gemini
   MODEL=gpt-4o                             # or gemini-1.5-pro
   ENVIRONMENT=development
   DEBUG=true
   ```

3. **Start the services**
   ```bash
   docker-compose up
   ```
   
   That's it! The application will automatically:
   - ✅ Wait for the database to be ready
   - ✅ Run database migrations
   - ✅ Seed initial data (test user + 50 personas)
   - ✅ Start all services

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - GraphQL Playground: http://localhost:8000/graphql

5. **Run tests** (optional)
   ```bash
   # Run tests against the running application
   docker-compose exec backend uv run pytest tests/test_simple_integration.py tests/test_graphql_live.py -v
   ```

## 🔧 Development

### Database Management

Use the development scripts for database operations:

```bash
# Create database
uv run python scripts/dev.py db-create

# Run migrations
uv run python scripts/dev.py db-migrate

# Seed data
uv run python scripts/dev.py db-seed

# Reset database
uv run python scripts/dev.py db-reset

# Run tests
uv run python scripts/dev.py test

# Run integration tests (requires running app)
docker-compose exec backend uv run pytest tests/test_simple_integration.py tests/test_graphql_live.py -v
```

### API Documentation

- **GraphQL Playground**: http://localhost:8000/graphql
- **GraphQL Schema**: Explore the full schema and run queries interactively

### Key GraphQL Operations

#### Authentication
- `signup` mutation - Create user account
- `login` mutation - Authenticate user
- `me` query - Get current user

#### Experiments
- `experiments` query - List experiments
- `runSimulation` mutation - Run simulation
- `experiment` query - Get experiment details

#### GraphQL Examples
```graphql
query GetExperiments {
  experiments {
    id
    ideaText
    status
    resultsSummary
  }
}

mutation RunSimulation($experimentData: ExperimentCreateInput!) {
  runSimulation(experimentData: $experimentData) {
    experimentId
    status
    sentimentBreakdown
    recommendation
  }
}
```

## 🧪 Testing

### Backend Integration Tests

The backend includes comprehensive integration tests that test actual GraphQL mutations with real PostgreSQL database:

#### Test Coverage
- **17 tests total** covering core functionality and GraphQL mutations
- **3 GraphQL mutations tested**: `runSimulation`, `generateCustomCohort`, `chatWithPersona`
- **Real database integration** with PostgreSQL
- **Authentication testing** with JWT tokens
- **Error handling** for invalid tokens and nonexistent resources

#### Running Tests

**Using Docker (Recommended):**
```bash
# Start the services first
docker-compose up -d postgres backend

# Run integration tests against the running app
docker-compose exec backend uv run pytest tests/test_simple_integration.py tests/test_graphql_live.py -v

# Results: 17 passed, 2 warnings in 3.34s
```

**Using Docker Compose Test Service:**
```bash
# Run tests using the dedicated test service
docker-compose run --rm backend-test

# This automatically starts postgres and runs all tests
```

**Local Development:**
```bash
cd backend
uv run pytest tests/test_simple_integration.py tests/test_graphql_live.py -v
```

#### Test Files
- **`test_simple_integration.py`** (7 tests) - Basic database and authentication tests
- **`test_graphql_live.py`** (10 tests) - Live GraphQL mutation tests with HTTP requests
- **`conftest.py`** - Pytest configuration and fixtures

#### Test Database
- Uses separate `synthsense_test` database
- Automatic cleanup between tests
- Seeded with test user (`test@example.com` / `test`) and sample personas

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚀 Deployment

### Production Docker Setup

1. **Update environment variables for production**
   ```bash
   # Set production values in .env files
   ENVIRONMENT=production
   DEBUG=false
   JWT_SECRET=your-production-secret-key
   ```

2. **Build and deploy**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Environment Variables

#### Root (.env) - For Docker Compose
```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/db
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
LLM_PROVIDER=openai
MODEL=gpt-4o
ENVIRONMENT=production
DEBUG=false
```

#### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/db
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
LLM_PROVIDER=openai
MODEL=gpt-4o
ENVIRONMENT=production
DEBUG=false
```

#### Frontend (.env)
```env
VITE_API_URL=https://your-api-domain.com
```

## 📚 API Reference

### Authentication Flow

1. **Signup**: `POST /api/auth/signup`
2. **Login**: `POST /api/auth/login`
3. **Use JWT**: Include `Authorization: Bearer <token>` header

### Simulation Workflow

1. **Create Experiment**: Use GraphQL `runSimulation` mutation
2. **Monitor Progress**: Poll experiment status
3. **View Results**: Access sentiment breakdown and recommendations
4. **Chat with Personas**: Use `chatWithPersona` mutation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API reference

## 🔄 Migration from Supabase

This project has been migrated from Supabase to a self-hosted solution. Key changes:

- **Database**: PostgreSQL with SQLAlchemy instead of Supabase
- **Authentication**: JWT-based auth instead of Supabase Auth
- **API**: GraphQL + REST instead of Supabase Edge Functions
- **AI**: LangChain/LangGraph instead of direct API calls
- **Deployment**: Docker instead of Supabase hosting

The migration maintains feature parity while providing more control and flexibility.
