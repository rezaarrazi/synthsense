"""
Simple integration test using synchronous database operations.
"""
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
import sys

# Add the app directory to Python path
app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

from app.config import settings
from app.models.user import User
from app.auth.password_handler import hash_password
from app.auth.jwt_handler import create_access_token


# Test database configuration (sync version)
TEST_DATABASE_URL = settings.TEST_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

# Create test sync engine
test_engine = create_engine(TEST_DATABASE_URL, echo=False)

# Create test sync session factory
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh sync database session for each test."""
    session = TestSessionLocal()
    
    try:
        yield session
    finally:
        # Clean up test data between tests
        try:
            session.execute(text("DELETE FROM users"))
            session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()


class TestSimpleIntegration:
    """Test basic database operations with sync sessions."""

    def test_database_connection(self, db_session):
        """Test basic database connectivity."""
        # Test that we can execute a simple query
        result = db_session.execute(text("SELECT 1 as test_value"))
        row = result.fetchone()
        assert row[0] == 1

    def test_user_creation(self, db_session):
        """Test user creation and retrieval."""
        # Create test user
        test_user = User(
            email="test@example.com",
            hashed_password=hash_password("test"),
            full_name="Test User"
        )
        
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)
        
        # Verify user was created
        assert test_user.id is not None
        assert test_user.email == "test@example.com"
        assert test_user.full_name == "Test User"
        
        # Verify we can retrieve the user
        retrieved_user = db_session.query(User).filter(User.email == "test@example.com").first()
        assert retrieved_user is not None
        assert retrieved_user.email == "test@example.com"

    def test_jwt_token_creation(self, db_session):
        """Test JWT token creation and validation."""
        # Create test user
        test_user = User(
            email="jwt_test@example.com",
            hashed_password=hash_password("test"),
            full_name="JWT Test User"
        )
        
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)
        
        # Create JWT token
        token = create_access_token(data={"sub": str(test_user.id)})
        
        # Verify token is not empty
        assert token is not None
        assert len(token) > 0
        
        # Basic token format check (should start with typical JWT pattern)
        assert "." in token  # JWT tokens have dots separating parts

    def test_database_isolation(self, db_session):
        """Test that database operations are isolated between tests."""
        # This test should run after the previous test and verify
        # that the previous test's data was cleaned up
        
        # Check that no users exist from previous tests
        users = db_session.query(User).all()
        
        # Should be empty due to cleanup in db_session fixture
        assert len(users) == 0

    def test_multiple_user_creation(self, db_session):
        """Test creating multiple users."""
        users_data = [
            {"email": "user1@test.com", "name": "User 1"},
            {"email": "user2@test.com", "name": "User 2"},
            {"email": "user3@test.com", "name": "User 3"},
        ]
        
        created_users = []
        for user_data in users_data:
            user = User(
                email=user_data["email"],
                hashed_password=hash_password("password"),
                full_name=user_data["name"]
            )
            db_session.add(user)
            created_users.append(user)
        
        db_session.commit()
        
        # Verify all users were created
        for user in created_users:
            db_session.refresh(user)
            assert user.id is not None
        
        # Verify we can retrieve all users
        all_users = db_session.query(User).all()
        assert len(all_users) == 3
        
        # Verify email uniqueness
        emails = [user.email for user in all_users]
        assert len(set(emails)) == 3  # All emails should be unique

    def test_password_hashing(self):
        """Test password hashing functionality."""
        password = "test_password"
        hashed = hash_password(password)
        
        # Verify hash is different from original password
        assert hashed != password
        assert len(hashed) > 0
        
        # Verify hash starts with bcrypt identifier
        assert hashed.startswith("$2b$")
        
        # Verify we can verify the password (this tests the verification function)
        from app.auth.password_handler import verify_password
        assert verify_password(password, hashed) is True
        assert verify_password("wrong_password", hashed) is False

    def test_configuration(self):
        """Test that configuration is loaded correctly."""
        # Test that database URL is configured
        assert settings.TEST_DATABASE_URL is not None
        assert "synthsense_test" in settings.TEST_DATABASE_URL
        
        # Test that JWT secret is configured
        assert settings.JWT_SECRET is not None
        assert len(settings.JWT_SECRET) > 0
