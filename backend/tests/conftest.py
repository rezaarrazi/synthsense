"""
Pytest configuration and fixtures for SynthSense Backend integration tests.
"""
import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
import os
import sys

# Add the app directory to Python path
app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

# Import app components without triggering AI service imports
from app.database import Base, AsyncSessionLocal, SessionLocal
from app.config import settings
from app.models.user import User
from app.models.persona import PersonaGenerationJob, Persona
from app.models.experiment import Experiment
from app.models.survey import SurveyResponse
from app.auth.password_handler import hash_password
from app.auth.jwt_handler import create_access_token
from sqlalchemy import select, text


# Test database configuration
TEST_DATABASE_URL = settings.TEST_DATABASE_URL

# Create test async engine
test_async_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    future=True,
)

# Create test async session factory
TestAsyncSessionLocal = async_sessionmaker(
    test_async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Create test sync engine
sync_test_database_url = TEST_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
test_sync_engine = create_engine(sync_test_database_url, echo=False)

# Create test sync session factory
TestSyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_sync_engine)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_test_database():
    """Create test database tables once for the entire test session."""
    async with test_async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Clean up at the end
    async with test_async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def db_session():
    """Create a fresh async database session for each test."""
    # Create session
    session = TestAsyncSessionLocal()
    
    try:
        yield session
    finally:
        # Clean up test data between tests
        try:
            await session.execute(text("DELETE FROM survey_responses"))
            await session.execute(text("DELETE FROM experiments"))
            await session.execute(text("DELETE FROM personas"))
            await session.execute(text("DELETE FROM persona_generation_jobs"))
            await session.execute(text("DELETE FROM users"))
            await session.commit()
        except Exception:
            await session.rollback()
        finally:
            await session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database dependency override."""
    # Import app here to avoid AI service import issues during conftest loading
    from app.main import app
    
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    # Override both async and sync database dependencies
    from app.database import get_db
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def test_user(db_session):
    """Create a test user for authentication."""
    # Check if test user already exists
    result = await db_session.execute(
        select(User).where(User.email == "test@example.com")
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        return existing_user
    
    # Create test user
    test_user = User(
        email="test@example.com",
        hashed_password=hash_password("test"),
        full_name="Test User"
    )
    
    db_session.add(test_user)
    await db_session.commit()
    await db_session.refresh(test_user)
    
    return test_user


@pytest.fixture(scope="function")
def test_user_token(test_user):
    """Create JWT token for test user."""
    return create_access_token(data={"sub": str(test_user.id)})


@pytest.fixture(scope="function")
async def test_personas(db_session):
    """Create test personas (General Audience group)."""
    # Check if General Audience already exists
    result = await db_session.execute(
        select(PersonaGenerationJob).where(PersonaGenerationJob.persona_group == "General Audience")
    )
    existing_job = result.scalar_one_or_none()
    
    if existing_job:
        # Get personas for this job
        personas_result = await db_session.execute(
            select(Persona).where(Persona.generation_job_id == existing_job.id)
        )
        return personas_result.scalars().all()
    
    # Create General Audience generation job
    job = PersonaGenerationJob(
        audience_description="A diverse group representing the general consumer population",
        persona_group="General Audience",
        short_description="Broad market testing",
        source="manual",
        status="completed",
        personas_generated=5,  # Create fewer personas for testing
        total_personas=5
    )
    db_session.add(job)
    await db_session.flush()  # Get the ID
    
    # Create sample personas
    sample_personas = [
        {"age": 31, "sex": "male", "city_country": "Zurich, Switzerland", "birth_city_country": "Cleveland, Ohio", "education": "Masters in Computer Science", "occupation": "software engineer", "income": "250 thousand swiss francs", "income_level": "very high", "relationship_status": "single"}, 
        {"age": 45, "sex": "female", "city_country": "San Antonio, United States", "birth_city_country": "San Antonio, United States", "education": "High School Diploma", "occupation": "shop owner", "income": "60 thousand us dollars", "income_level": "middle", "relationship_status": "married"},
        {"age": 52, "sex": "male", "city_country": "Helsinki, Finland", "birth_city_country": "Turku, Finland", "education": "Doctorate in Medicine", "occupation": "surgeon", "income": "150 thousand euros", "income_level": "high", "relationship_status": "married"},
        {"age": 29, "sex": "male", "city_country": "Dublin, Ireland", "birth_city_country": "Cork, Ireland", "education": "Masters in Data Science", "occupation": "data scientist", "income": "70 thousand euros", "income_level": "high", "relationship_status": "single"},
        {"age": 21, "sex": "male", "city_country": "Amsterdam, Netherlands", "birth_city_country": "Rotterdam, Netherlands", "education": "Studying Bachelors in Graphic Design", "occupation": "part-time graphic designer", "income": "15 thousand euros", "income_level": "low", "relationship_status": "single"},
    ]
    
    personas = []
    for i, persona_data in enumerate(sample_personas):
        persona_name = f"Persona #{i+1}"
        
        persona = Persona(
            generation_job_id=job.id,
            persona_name=persona_name,
            persona_data=persona_data
        )
        db_session.add(persona)
        personas.append(persona)
    
    await db_session.commit()
    return personas


@pytest.fixture(scope="function")
async def test_experiment(db_session, test_user, test_personas):
    """Create a test experiment with survey responses."""
    # Create experiment
    experiment = Experiment(
        user_id=test_user.id,
        idea_text="Test product idea",
        question_text="How likely are you to purchase this product?",
        status="completed",
        persona_count=len(test_personas),
        title="Test Experiment"
    )
    
    db_session.add(experiment)
    await db_session.flush()  # Get the ID
    
    # Create survey responses for each persona
    for persona in test_personas:
        survey_response = SurveyResponse(
            experiment_id=experiment.id,
            persona_id=persona.id,
            user_id=test_user.id,
            response_text=f"Test response from {persona.persona_name}",
            likert=4,  # Neutral-positive response
            response_metadata={"test": True}
        )
        db_session.add(survey_response)
    
    await db_session.commit()
    await db_session.refresh(experiment)
    
    return experiment
