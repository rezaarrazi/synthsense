#!/usr/bin/env python3
"""
Startup script for the backend container.
Automatically runs database migrations and seeds data on first startup.
"""
import asyncio
import sys
import os
import subprocess
import time

# Add the app directory to Python path
app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

# Import after setting up the path
from scripts.manage_db import create_db, run_migrations, seed_personas, seed_test_user


async def wait_for_database(max_retries=30, delay=2):
    """Wait for the database to be available."""
    print("Waiting for database to be available...")
    
    for attempt in range(max_retries):
        try:
            # Try to create the database (this will fail if postgres isn't ready)
            await create_db()
            print("Database is available!")
            return True
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Database not ready yet (attempt {attempt + 1}/{max_retries}): {e}")
                await asyncio.sleep(delay)
            else:
                print(f"Database failed to become available after {max_retries} attempts: {e}")
                return False
    
    return False


async def run_startup_migrations():
    """Run migrations if needed."""
    print("Checking if migrations need to be applied...")
    
    try:
        # Check current migration status
        result = subprocess.run(
            ["uv", "run", "alembic", "current"],
            cwd="/app",
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            current_revision = result.stdout.strip()
            if not current_revision or "head" not in current_revision:
                print("No migrations applied yet, running migrations...")
                success = await run_migrations()
                if success:
                    print("✅ Migrations applied successfully")
                    return True
                else:
                    print("❌ Migration failed")
                    return False
            else:
                print("✅ Database is already up to date")
                return True
        else:
            print("❌ Failed to check migration status")
            return False
            
    except Exception as e:
        print(f"❌ Error during migration check: {e}")
        return False


async def seed_initial_data():
    """Seed initial data if the database is empty."""
    print("Checking if initial data needs to be seeded...")
    
    try:
        # Check if we have any users
        from app.database import AsyncSessionLocal
        from sqlalchemy import text
        
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.scalar()
            
            if user_count == 0:
                print("No users found, seeding initial data...")
                await seed_test_user()
                print("✅ Test user seeded")
            else:
                print("✅ Users already exist, skipping user seeding")
            
            # Check if we have any personas
            result = await session.execute(text("SELECT COUNT(*) FROM persona_generation_jobs"))
            job_count = result.scalar()
            
            if job_count == 0:
                print("No persona jobs found, seeding personas...")
                await seed_personas()
                print("✅ Personas seeded")
            else:
                print("✅ Personas already exist, skipping persona seeding")
                
        return True
        
    except Exception as e:
        print(f"❌ Error during data seeding: {e}")
        return False


async def startup():
    """Main startup routine."""
    print("🚀 Starting backend application...")
    
    # Step 1: Wait for database
    if not await wait_for_database():
        print("❌ Failed to connect to database, exiting")
        sys.exit(1)
    
    # Step 2: Run migrations
    if not await run_startup_migrations():
        print("❌ Migration failed, exiting")
        sys.exit(1)
    
    # Step 3: Seed initial data
    if not await seed_initial_data():
        print("❌ Data seeding failed, exiting")
        sys.exit(1)
    
    print("✅ Startup completed successfully!")
    print("🎯 Starting FastAPI server...")


if __name__ == "__main__":
    asyncio.run(startup())
