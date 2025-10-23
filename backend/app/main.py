from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.graphql.main import graphql_app

app = FastAPI(
    title="SynthSense API",
    description="Synthetic Consumer Research Platform - GraphQL API",
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

# Add GraphQL endpoint
app.include_router(graphql_app, prefix="/graphql")


@app.get("/")
async def root():
    return {"message": "SynthSense GraphQL API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
