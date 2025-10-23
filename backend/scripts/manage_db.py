import asyncio
import sys
import os
import asyncpg
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add the app directory to Python path
app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

from app.config import settings
from app.database import Base
from app.models import *  # noqa


async def create_db():
    """Create database if it doesn't exist."""
    # Convert SQLAlchemy URL to asyncpg URL
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    print(f"Original URL: {settings.DATABASE_URL}")
    print(f"Modified URL: {db_url}")
    
    # Parse URL manually to avoid issues
    if db_url.startswith("postgresql://"):
        # Extract parts: postgresql://user:pass@host:port/db
        url_without_scheme = db_url[13:]  # Remove "postgresql://"
        if "@" in url_without_scheme:
            auth_part, host_part = url_without_scheme.split("@", 1)
            if ":" in host_part:
                host_port, db_name = host_part.split("/", 1)
                base_url = f"postgresql://{auth_part}@{host_port}"
            else:
                base_url = f"postgresql://{auth_part}@{host_part}"
                db_name = "synthsense"
        else:
            # No auth
            if "/" in url_without_scheme:
                host_port, db_name = url_without_scheme.split("/", 1)
                base_url = f"postgresql://{host_port}"
            else:
                base_url = f"postgresql://{url_without_scheme}"
                db_name = "synthsense"
    else:
        raise ValueError(f"Unexpected URL format: {db_url}")
    
    print(f"Base URL: {base_url}")
    print(f"DB Name: {db_name}")
    print(f"Connecting to: {base_url}/postgres")
    
    # Connect to postgres database to create our database
    conn = await asyncpg.connect(f"{base_url}/postgres")
    
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
    # Convert SQLAlchemy URL to asyncpg URL
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    print(f"Original URL: {settings.DATABASE_URL}")
    print(f"Modified URL: {db_url}")
    
    # Parse URL manually to avoid issues
    if db_url.startswith("postgresql://"):
        # Extract parts: postgresql://user:pass@host:port/db
        url_without_scheme = db_url[13:]  # Remove "postgresql://"
        if "@" in url_without_scheme:
            auth_part, host_part = url_without_scheme.split("@", 1)
            if ":" in host_part:
                host_port, db_name = host_part.split("/", 1)
                base_url = f"postgresql://{auth_part}@{host_port}"
            else:
                base_url = f"postgresql://{auth_part}@{host_part}"
                db_name = "synthsense"
        else:
            # No auth
            if "/" in url_without_scheme:
                host_port, db_name = url_without_scheme.split("/", 1)
                base_url = f"postgresql://{host_port}"
            else:
                base_url = f"postgresql://{url_without_scheme}"
                db_name = "synthsense"
    else:
        raise ValueError(f"Unexpected URL format: {db_url}")
    
    print(f"Base URL: {base_url}")
    print(f"DB Name: {db_name}")
    print(f"Connecting to: {base_url}/postgres")
    
    # Connect to postgres database
    conn = await asyncpg.connect(f"{base_url}/postgres")
    
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
        cwd="/app",  # Use container path instead of host path
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


async def seed_test_user():
    """Seed a test user for development."""
    from app.database import AsyncSessionLocal
    from app.models import User
    import bcrypt
    
    # Use bcrypt directly to avoid passlib issues
    def bcrypt_hash(password: str) -> str:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    async with AsyncSessionLocal() as session:
        try:
            # Check if test user already exists
            existing = await session.execute(
                text("SELECT id FROM users WHERE email = 'test@example.com'")
            )
            if existing.fetchone():
                print("Test user already exists")
                return
            
            # Create test user
            test_user = User(
                email="test@example.com",
                hashed_password=bcrypt_hash("test"),
                full_name="Test User"
            )
            session.add(test_user)
            await session.commit()
            print("Test user seeded successfully")
            print("Email: test@example.com")
            print("Password: test")
            
        except Exception as e:
            await session.rollback()
            print(f"Error seeding test user: {e}")
            raise


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
                personas_generated=50,
                total_personas=50
            )
            session.add(job)
            await session.flush()  # Get the ID
            
            # Create sample personas (simplified for seeding)
            sample_personas = [
                {"age": 31, "sex": "male", "city_country": "Zurich, Switzerland", "birth_city_country": "Cleveland, Ohio", "education": "Masters in Computer Science", "occupation": "software engineer", "income": "250 thousand swiss francs", "income_level": "very high", "relationship_status": "single"}, 
                {"age": 45, "sex": "female", "city_country": "San Antonio, United States", "birth_city_country": "San Antonio, United States", "education": "High School Diploma", "occupation": "shop owner", "income": "60 thousand us dollars", "income_level": "middle", "relationship_status": "married"},
                {"age": 52, "sex": "male", "city_country": "Helsinki, Finland", "birth_city_country": "Turku, Finland", "education": "Doctorate in Medicine", "occupation": "surgeon", "income": "150 thousand euros", "income_level": "high", "relationship_status": "married"},
                {"age": 62, "sex": "male", "city_country": "Oslo, Norway", "birth_city_country": "Bergen, Norway", "education": "Masters in Structural Engineering", "occupation": "structural engineer", "income": "600 thousand Norwegian Krone", "income_level": "high", "relationship_status": "married"},
                {"age": 29, "sex": "male", "city_country": "Dublin, Ireland", "birth_city_country": "Cork, Ireland", "education": "Masters in Data Science", "occupation": "data scientist", "income": "70 thousand euros", "income_level": "high", "relationship_status": "single"},
                {"age": 21, "sex": "male", "city_country": "Amsterdam, Netherlands", "birth_city_country": "Rotterdam, Netherlands", "education": "Studying Bachelors in Graphic Design", "occupation": "part-time graphic designer", "income": "15 thousand euros", "income_level": "low", "relationship_status": "single"},
                {"age": 55, "sex": "female", "city_country": "Berlin, Germany", "birth_city_country": "Hamburg, Germany", "education": "PhD in German Literature", "occupation": "college professor", "income": "70 thousand euros", "income_level": "middle", "relationship_status": "widowed"},
                {"age": 29, "sex": "female", "city_country": "Stockholm, Sweden", "birth_city_country": "Malmo, Sweden", "education": "Bachelors in Computer Science", "occupation": "web developer", "income": "55 thousand swedish krona", "income_level": "middle", "relationship_status": "in a relationship"},
                {"age": 23, "sex": "male", "city_country": "New York, United States", "birth_city_country": "Los Angeles, United States", "education": "Currently studying Bachelors in Film Studies", "occupation": "part-time film editor", "income": "20 thousand US dollars", "income_level": "low", "relationship_status": "single"},
                {"age": 24, "sex": "female", "city_country": "Paris, France", "birth_city_country": "Marseille, France", "education": "Bachelors in Fashion Design", "occupation": "fashion designer", "income": "40 thousand euros", "income_level": "middle", "relationship_status": "single"},
                {"age": 28, "sex": "male", "city_country": "Istanbul, Turkey", "birth_city_country": "Ankara, Turkey", "education": "Bachelors in Marketing", "occupation": "marketing manager", "income": "60 thousand turkish lira", "income_level": "middle", "relationship_status": "engaged"},
                {"age": 47, "sex": "female", "city_country": "Toronto, Canada", "birth_city_country": "Montreal, Canada", "education": "Masters in Psychology", "occupation": "psychologist", "income": "85 thousand Canadian dollars", "income_level": "middle", "relationship_status": "divorced"},
                {"age": 30, "sex": "female", "city_country": "Gothenburg, Sweden", "birth_city_country": "Stockholm, Sweden", "education": "Masters in Architecture", "occupation": "architect", "income": "550 thousand Swedish Krona", "income_level": "middle", "relationship_status": "in a relationship"},
                {"age": 23, "sex": "male", "city_country": "New Delhi, India", "birth_city_country": "Kolkata, India", "education": "studying towards a Bachelors in Commerce", "occupation": "part-time retail worker", "income": "200 thousand indian rupees", "income_level": "low", "relationship_status": "single"},
                {"age": 19, "sex": "male", "city_country": "London, United Kingdom", "birth_city_country": "Budapest, Hungary", "education": "studying towards a Bachelors in Economics", "occupation": "part-time waiter", "income": " 10 thousand pounds", "income_level": "low", "relationship_status": "in a relationship"},
                {"age": 61, "sex": "male", "city_country": "Auckland, New Zealand", "birth_city_country": "Christchurch, New Zealand", "education": "High School Diploma", "occupation": "retiree", "income": "20 thousand new zealand dollars", "income_level": "low", "relationship_status": "married"},
                {"age": 33, "sex": "female", "city_country": "Beijing, China", "birth_city_country": "Shanghai, China", "education": "Masters in Architecture", "occupation": "architect", "income": "260 thousand chinese yuan", "income_level": "high", "relationship_status": "single"},
                {"age": 33, "sex": "male", "city_country": "Tokyo, Japan", "birth_city_country": "Nagoya, Japan", "education": "Masters in Computer Engineering", "occupation": "game developer", "income": "7 million Japanese yen", "income_level": "high", "relationship_status": "single"},
                {"age": 25, "sex": "male", "city_country": "Osaka, Japan", "birth_city_country": "Tokyo, Japan", "education": "Bachelors in Software Engineering", "occupation": "junior software developer", "income": "6 million japanese yen", "income_level": "middle", "relationship_status": "single"},
                {"age": 58, "sex": "female", "city_country": "Cape Town, South Africa", "birth_city_country": "Durban, South Africa", "education": "Masters in Education", "occupation": "high school principal", "income": "400 thousand South African rand", "income_level": "middle", "relationship_status": "married"},
                {"age": 56, "sex": "female", "city_country": "Madrid, Spain", "birth_city_country": "Barcelona, Spain", "education": "High School Diploma", "occupation": "nurse", "income": "30 thousand euros", "income_level": "middle", "relationship_status": "widowed"},
                {"age": 51, "sex": "male", "city_country": "Buenos Aires, Argentina", "birth_city_country": "Mendoza, Argentina", "education": "Law Degree", "occupation": "lawyer", "income": "800 thousand Argentine Peso", "income_level": "middle", "relationship_status": "divorced"},
                {"age": 45, "sex": "male", "city_country": "Paris, France", "birth_city_country": "Lyon, France", "education": "Masters in Art History", "occupation": "art curator", "income": "70 thousand euros", "income_level": "high", "relationship_status": "single"},
                {"age": 55, "sex": "male", "city_country": "Montreal, Canada", "birth_city_country": "Montreal, Canada", "education": "Bachelors in Business Administration", "occupation": "financial manager", "income": "90 thousand canadian dollars", "income_level": "middle", "relationship_status": "divorced"},
                {"age": 36, "sex": "male", "city_country": "Madrid, Spain", "birth_city_country": "Barcelona, Spain", "education": "Bachelors in History", "occupation": "museum curator", "income": "40 thousand euros", "income_level": "middle", "relationship_status": "married"},
                {"age": 37, "sex": "male", "city_country": "Rio de Janeiro, Brazil", "birth_city_country": "Sao Paulo, Brazil", "education": "High School Diploma", "occupation": "chef", "income": "45 thousand brazilian reais", "income_level": "middle", "relationship_status": "married"},
                {"age": 41, "sex": "female", "city_country": "Rome, Italy", "birth_city_country": "Bologna, Italy", "education": "Diploma in Gastronomy", "occupation": "chef", "income": "35 thousand euros", "income_level": "middle", "relationship_status": "divorced"},
                {"age": 42, "sex": "female", "city_country": "Rome, Italy", "birth_city_country": "Naples, Italy", "education": "Doctorate in History", "occupation": "university professor", "income": "75 thousand euros", "income_level": "high", "relationship_status": "married"},
                {"age": 22, "sex": "female", "city_country": "Helsinki, Finland", "birth_city_country": "Turku, Finland", "education": "studying towards a Bachelors in International Relations", "occupation": "part-time tutor", "income": "15 thousand euros", "income_level": "low", "relationship_status": "single"},
                {"age": 50, "sex": "male", "city_country": "New Delhi, India", "birth_city_country": "Kolkata, India", "education": "PhD in Astrophysics", "occupation": "university professor", "income": "12 lakh Indian rupees", "income_level": "middle", "relationship_status": "divorced"},
                {"age": 68, "sex": "male", "city_country": "Sydney, Australia", "birth_city_country": "Melbourne, Australia", "education": "Bachelors in Business Administration", "occupation": "retired CEO", "income": "80 thousand Australian dollars", "income_level": "high", "relationship_status": "widowed"},
                {"age": 39, "sex": "female", "city_country": "Mexico City, Mexico", "birth_city_country": "Guadalajara, Mexico", "education": "Masters in Business Administration", "occupation": "business development manager", "income": "400 thousand Mexican pesos", "income_level": "middle", "relationship_status": "married"},
                {"age": 39, "sex": "female", "city_country": "Edinburgh, United Kingdom", "birth_city_country": "Glasgow, United Kingdom", "education": "Doctorate in Astronomy", "occupation": "astronomer", "income": "80 thousand pounds", "income_level": "high", "relationship_status": "married"},
                {"age": 50, "sex": "female", "city_country": "Sydney, Australia", "birth_city_country": "Perth, Australia", "education": "Masters in Finance", "occupation": "financial analyst", "income": "100 thousand australian dollars", "income_level": "high", "relationship_status": "divorced"},
                {"age": 27, "sex": "male", "city_country": "Bogota, Colombia", "birth_city_country": "Cali, Colombia", "education": "Bachelors in Graphic Design", "occupation": "graphic designer", "income": "20 million colombian pesos", "income_level": "middle", "relationship_status": "married"},
                {"age": 35, "sex": "female", "city_country": "Munich, Germany", "birth_city_country": "Berlin, Germany", "education": "Doctorate in Physics", "occupation": "research scientist", "income": "100 thousand euros", "income_level": "high", "relationship_status": "single"},
                {"age": 26, "sex": "female", "city_country": "Lisbon, Portugal", "birth_city_country": "Porto, Portugal", "education": "Bachelors in Visual Arts", "occupation": "graphic designer", "income": "30 thousand euros", "income_level": "middle", "relationship_status": "in a relationship"},
                {"age": 27, "sex": "female", "city_country": "Wellington, New Zealand", "birth_city_country": "Auckland, New Zealand", "education": "Bachelors in Environmental Sciences", "occupation": "environmental consultant", "income": "55 thousand New Zealand dollars", "income_level": "middle", "relationship_status": "in a relationship"},
                {"age": 37, "sex": "female", "city_country": "Lusaka, Zambia", "birth_city_country": "Ndola, Zambia", "education": "Diploma in Nursing", "occupation": "nurse", "income": "18 thousand Zambian kwacha", "income_level": "middle", "relationship_status": "married"},
                {"age": 48, "sex": "female", "city_country": "Cape Town, South Africa", "birth_city_country": "Johannesburg, South Africa", "education": "Masters in Public Health", "occupation": "health inspector", "income": "450 thousand south african rand", "income_level": "middle", "relationship_status": "widowed"},
                {"age": 22, "sex": "female", "city_country": "Manila, Philippines", "birth_city_country": "Cebu, Philippines", "education": "Associate Degree in Business Administration", "occupation": "retail assistant", "income": "8 thousand US dollars", "income_level": "low", "relationship_status": "single"},
                {"age": 34, "sex": "male", "city_country": "Lagos, Nigeria", "birth_city_country": "Ibadan, Nigeria", "education": "High School Diploma", "occupation": "motorbike courier", "income": "5 thousand US dollars", "income_level": "low", "relationship_status": "married"},
                {"age": 28, "sex": "female", "city_country": "Hanoi, Vietnam", "birth_city_country": "Da Nang, Vietnam", "education": "Bachelors in Fine Arts", "occupation": "freelance painter", "income": "9 thousand US dollars", "income_level": "low", "relationship_status": "single"},
                {"age": 30, "sex": "male", "city_country": "Medellín, Colombia", "birth_city_country": "Cali, Colombia", "education": "Bachelors in Mechanical Engineering", "occupation": "mechanic", "income": "10 thousand US dollars", "income_level": "low", "relationship_status": "married"},
                {"age": 25, "sex": "female", "city_country": "Jakarta, Indonesia", "birth_city_country": "Bandung, Indonesia", "education": "Diploma in Culinary Arts", "occupation": "barista", "income": "6 thousand US dollars", "income_level": "low", "relationship_status": "single"},
                {"age": 48, "sex": "male", "city_country": "San Francisco, United States", "birth_city_country": "Boston, United States", "education": "MBA in Finance", "occupation": "venture capitalist", "income": "2 million US dollars", "income_level": "very high", "relationship_status": "married"},
                {"age": 41, "sex": "female", "city_country": "Zurich, Switzerland", "birth_city_country": "Bern, Switzerland", "education": "PhD in Economics", "occupation": "investment banker", "income": "1.5 million swiss francs", "income_level": "very high", "relationship_status": "married"},
                {"age": 35, "sex": "male", "city_country": "Dubai, United Arab Emirates", "birth_city_country": "Abu Dhabi, United Arab Emirates", "education": "Masters in Business Administration", "occupation": "tech startup founder", "income": "3 million UAE dirhams", "income_level": "very high", "relationship_status": "married"},
                {"age": 50, "sex": "female", "city_country": "London, United Kingdom", "birth_city_country": "Edinburgh, United Kingdom", "education": "Masters in Architecture", "occupation": "architect and firm owner", "income": "900 thousand pounds", "income_level": "very high", "relationship_status": "married"},
                {"age": 37, "sex": "male", "city_country": "Singapore, Singapore", "birth_city_country": "Penang, Malaysia", "education": "Masters in Computer Science", "occupation": "AI company CTO", "income": "1.2 million singapore dollars", "income_level": "very high", "relationship_status": "married"},
            ]
            
            for i, persona_data in enumerate(sample_personas):
                # Generate a persona name based on the data
                persona_name = f"Persona #{i+1}"
                
                persona = Persona(
                    generation_job_id=job.id,
                    persona_name=persona_name,
                    persona_data=persona_data
                )
                session.add(persona)
            
            await session.commit()
            print("Sample personas seeded successfully")
            
        except Exception as e:
            await session.rollback()
            print(f"Error seeding personas: {e}")
            raise


async def seed_all():
    """Seed both test user and personas."""
    await seed_test_user()
    await seed_personas()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python manage_db.py <command>")
        print("Commands: create, drop, reset, migrate, seed, seed-user, seed-personas")
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
        asyncio.run(seed_all())
    elif command == "seed-user":
        asyncio.run(seed_test_user())
    elif command == "seed-personas":
        asyncio.run(seed_personas())
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
