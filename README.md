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
   # Copy example files
   cp .env.example .env
   cp backend/env.example backend/.env
   cp frontend/env.example frontend/.env
   ```
   
   Edit the `.env` files with your configuration:
   ```env
   # .env (for Docker Compose)
   DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/synthsense
   JWT_SECRET=your-secret-key-change-in-production
   OPENAI_API_KEY=your-openai-api-key-here
   GEMINI_API_KEY=your-gemini-key-here
   LLM_PROVIDER=openai
   MODEL=gpt-4o
   
   # backend/.env
   DATABASE_URL=postgresql+asyncpg://postgres:password@postgres:5432/synthsense
   JWT_SECRET=your-secret-key-change-in-production
   OPENAI_API_KEY=your-openai-api-key-here
   GEMINI_API_KEY=your-gemini-key-here
   LLM_PROVIDER=openai
   MODEL=gpt-4o
   
   # frontend/.env
   VITE_API_URL=http://localhost:8000
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker-compose exec backend uv run alembic upgrade head
   ```

5. **Seed initial data**
   ```bash
   docker-compose exec backend python scripts/manage_db.py seed
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - GraphQL Playground: http://localhost:8000/graphql

### Local Development

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   uv sync
   ```

3. **Set up PostgreSQL**
   ```bash
   # Start PostgreSQL (using Docker)
   docker run --name synthsense-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=synthsense -p 5432:5432 -d postgres:15-alpine
   ```

4. **Run database setup**
   ```bash
   uv run python scripts/manage_db.py create
   uv run alembic upgrade head
   uv run python scripts/manage_db.py seed
   ```

5. **Start the development server**
   ```bash
   uv run python scripts/dev.py serve
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
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
```

### API Documentation

- **REST API**: http://localhost:8000/docs (Swagger UI)
- **GraphQL Playground**: http://localhost:8000/graphql
- **ReDoc**: http://localhost:8000/redoc

### Key API Endpoints

#### Authentication
- `POST /api/auth/signup` - Create user account
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/me` - Get current user

#### Experiments
- `GET /api/experiments` - List experiments
- `POST /api/experiments/simulate` - Run simulation
- `GET /api/experiments/{id}` - Get experiment details

#### GraphQL Queries
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

### Backend Tests
```bash
cd backend
uv run pytest tests/ -v
```

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
