import typer
import subprocess
import asyncio
from scripts.manage_db import create_db, drop_db, reset_db, run_migrations, seed_personas

app = typer.Typer()


@app.command()
def db_create():
    """Create database if it doesn't exist."""
    asyncio.run(create_db())


@app.command()
def db_drop():
    """Drop database (with confirmation)."""
    asyncio.run(drop_db())


@app.command()
def db_reset():
    """Drop and recreate database."""
    asyncio.run(reset_db())


@app.command()
def db_migrate():
    """Apply pending migrations."""
    asyncio.run(run_migrations())


@app.command()
def db_seed():
    """Seed default personas."""
    asyncio.run(seed_personas())


@app.command()
def test():
    """Run tests."""
    result = subprocess.run(
        ["uv", "run", "pytest", "tests/", "-v"],
        cwd="/home/reza/projects/synthsense/backend"
    )
    return result.returncode


@app.command()
def serve():
    """Run development server."""
    subprocess.run([
        "uv", "run", "uvicorn", 
        "app.main:app", 
        "--reload", 
        "--host", "0.0.0.0", 
        "--port", "8000"
    ], cwd="/home/reza/projects/synthsense/backend")


if __name__ == "__main__":
    app()
