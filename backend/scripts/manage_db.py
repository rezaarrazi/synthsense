import asyncio
import asyncpg
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from app.database import Base
from app.models import *  # noqa


async def create_db():
    """Create database if it doesn't exist."""
    # Extract database name from URL
    db_url_parts = settings.DATABASE_URL.split("/")
    db_name = db_url_parts[-1]
    base_url = "/".join(db_url_parts[:-1])
    
    # Connect to postgres database to create our database
    conn = await asyncpg.connect(base_url + "/postgres")
    
    try:
        # Check if database exists
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", db_name
        )
        
        if not exists:
            await conn.execute(f'CREATE DATABASE "{db_name}"')
            print(f"Database '{db_name}' created successfully")
        else:
            print(f"Database '{db_name}' already exists")
    finally:
        await conn.close()


async def drop_db():
    """Drop database (with confirmation)."""
    # Extract database name from URL
    db_url_parts = settings.DATABASE_URL.split("/")
    db_name = db_url_parts[-1]
    base_url = "/".join(db_url_parts[:-1])
    
    # Connect to postgres database
    conn = await asyncpg.connect(base_url + "/postgres")
    
    try:
        # Check if database exists
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", db_name
        )
        
        if exists:
            # Terminate all connections to the database
            await conn.execute(f"""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = '{db_name}' AND pid <> pg_backend_pid()
            """)
            
            await conn.execute(f'DROP DATABASE "{db_name}"')
            print(f"Database '{db_name}' dropped successfully")
        else:
            print(f"Database '{db_name}' does not exist")
    finally:
        await conn.close()


async def reset_db():
    """Drop and recreate database."""
    await drop_db()
    await create_db()


async def run_migrations():
    """Apply pending migrations."""
    import subprocess
    result = subprocess.run(
        ["uv", "run", "alembic", "upgrade", "head"],
        cwd="/home/reza/projects/synthsense/backend",
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        print("Migrations applied successfully")
        print(result.stdout)
    else:
        print("Migration failed:")
        print(result.stderr)
        return False
    
    return True


async def seed_personas():
    """Seed default persona groups."""
    from app.database import AsyncSessionLocal
    from app.models import PersonaGenerationJob, Persona
    import json
    
    async with AsyncSessionLocal() as session:
        try:
            # Check if General Audience already exists
            existing = await session.execute(
                text("SELECT id FROM persona_generation_jobs WHERE persona_group = 'General Audience'")
            )
            if existing.fetchone():
                print("General Audience personas already exist")
                return
            
            # Create General Audience generation job
            job = PersonaGenerationJob(
                audience_description="A diverse group representing the general consumer population",
                persona_group="General Audience",
                short_description="Broad market testing",
                source="manual",
                status="completed",
                personas_generated=100,
                total_personas=100
            )
            session.add(job)
            await session.flush()  # Get the ID
            
            # Create sample personas (simplified for seeding)
            sample_personas = [
                {
                    "persona_name": "Sarah Johnson",
                    "age": 28,
                    "birth_city_country": "Chicago, USA",
                    "city_country": "Seattle, USA",
                    "education": "Bachelor's Degree in Marketing",
                    "income": "$65,000",
                    "income_level": "medium",
                    "occupation": "Marketing Coordinator",
                    "relationship_status": "Single",
                    "sex": "Female"
                },
                {
                    "persona_name": "Michael Chen",
                    "age": 35,
                    "birth_city_country": "San Francisco, USA",
                    "city_country": "Austin, USA",
                    "education": "Master's Degree in Computer Science",
                    "income": "$120,000",
                    "income_level": "high",
                    "occupation": "Software Engineer",
                    "relationship_status": "Married",
                    "sex": "Male"
                },
                {
                    "persona_name": "Emily Rodriguez",
                    "age": 42,
                    "birth_city_country": "Miami, USA",
                    "city_country": "Denver, USA",
                    "education": "High School",
                    "income": "$45,000",
                    "income_level": "medium",
                    "occupation": "Retail Manager",
                    "relationship_status": "Divorced",
                    "sex": "Female"
                }
            ]
            
            for persona_data in sample_personas:
                persona = Persona(
                    generation_job_id=job.id,
                    persona_name=persona_data["persona_name"],
                    persona_data=persona_data
                )
                session.add(persona)
            
            await session.commit()
            print("Sample personas seeded successfully")
            
        except Exception as e:
            await session.rollback()
            print(f"Error seeding personas: {e}")
            raise


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python manage_db.py <command>")
        print("Commands: create, drop, reset, migrate, seed")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "create":
        asyncio.run(create_db())
    elif command == "drop":
        asyncio.run(drop_db())
    elif command == "reset":
        asyncio.run(reset_db())
    elif command == "migrate":
        asyncio.run(run_migrations())
    elif command == "seed":
        asyncio.run(seed_personas())
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
