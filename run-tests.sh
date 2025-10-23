#!/bin/bash
# Test runner script for SynthSense Backend Integration Tests

set -e

echo "🧪 SynthSense Backend Integration Tests"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "docker-compose.yaml" ]; then
    echo "❌ Error: docker-compose.yaml not found. Please run this script from the project root."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "📋 Setting up test environment..."

# Start PostgreSQL if not running
echo "🐘 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=60
counter=0
while ! docker-compose exec postgres pg_isready -U postgres > /dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        echo "❌ Error: PostgreSQL failed to start within $timeout seconds"
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done

echo "✅ PostgreSQL is ready!"

# Create test database
echo "🗄️  Creating test database..."
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE synthsense_test;" || echo "Test database already exists"

# Run migrations on test database
echo "🔄 Running migrations on test database..."
docker-compose run --rm backend uv run alembic upgrade head

# Seed test database
echo "🌱 Seeding test database..."
docker-compose run --rm backend uv run python scripts/manage_db.py seed-test

echo "🚀 Running integration tests..."
echo "================================"

# Run the tests
docker-compose run --rm backend-test

echo ""
echo "✅ Tests completed!"
echo "📊 Check the output above for test results."
