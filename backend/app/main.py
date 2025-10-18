from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.auth import router as auth_router
from app.api.experiments import router as experiments_router
from app.api.personas import router as personas_router
from app.api.simulations import router as simulations_router
from app.graphql.main import graphql_app
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.jwt_handler import decode_token

app = FastAPI(
    title="SynthSense API",
    description="Synthetic Consumer Research Platform",
    version="0.1.0",
    debug=settings.DEBUG,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(experiments_router)
app.include_router(personas_router)
app.include_router(simulations_router)

# Add GraphQL endpoint
app.include_router(graphql_app, prefix="/graphql")


@app.middleware("http")
async def add_context_to_request(request: Request, call_next):
    """Add database session and user context to request."""
    # Get database session
    async for db in get_db():
        request.state.db = db
        break
    
    # Extract user from JWT token if present
    auth_header = request.headers.get("Authorization")
    user = None
    
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        user_id = decode_token(token).get("sub") if decode_token(token) else None
        
        if user_id:
            try:
                user = await get_current_user(token, db)
            except Exception:
                pass  # Invalid token, continue without user
    
    request.state.user = user
    
    response = await call_next(request)
    return response


@app.get("/")
async def root():
    return {"message": "SynthSense API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
