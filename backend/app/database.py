from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import create_engine
from app.config import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Create synchronous engine for GraphQL resolvers
# Convert async URL to sync URL
sync_database_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
sync_engine = create_engine(sync_database_url, echo=settings.DEBUG)

# Create synchronous session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

# Create declarative base
class Base(DeclarativeBase):
    pass


# Dependency to get database session
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# Synchronous database session for GraphQL resolvers
def get_db_session_sync():
    """Get a synchronous database session for GraphQL resolvers."""
    return SessionLocal()
