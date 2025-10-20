import strawberry
from typing import Optional
from app.models.user import User
from app.auth.password_handler import hash_password, verify_password
from app.auth.jwt_handler import create_access_token
from app.graphql.schema import UserCreateInput, UserLoginInput, UserUpdateInput, TokenType, UserType


@strawberry.type
class AuthMutation:
    @strawberry.mutation
    def signup(self, user_data: UserCreateInput) -> TokenType:
        """Create a new user account."""
        try:
            from app.database import get_db_session_sync
            with get_db_session_sync() as db:
                # Check if user already exists
                existing_user = db.query(User).filter(User.email == user_data.email).first()
                if existing_user:
                    raise Exception("Email already registered")
                
                # Create new user
                hashed_password = hash_password(user_data.password)
                user = User(
                    email=user_data.email,
                    hashed_password=hashed_password,
                    full_name=user_data.full_name
                )
                
                db.add(user)
                db.commit()
                db.refresh(user)
                
                # Create access token
                access_token = create_access_token(data={"sub": str(user.id)})
                
                return TokenType(access_token=access_token, token_type="bearer")
                
        except Exception as e:
            raise Exception(f"Signup failed: {str(e)}")
    
    @strawberry.mutation
    def login(self, credentials: UserLoginInput) -> TokenType:
        """Authenticate user and return access token."""
        try:
            from app.database import get_db_session_sync
            with get_db_session_sync() as db:
                # Find user by email
                user = db.query(User).filter(User.email == credentials.email).first()
                
                if not user or not verify_password(credentials.password, user.hashed_password):
                    raise Exception("Incorrect email or password")
                
                # Create access token
                access_token = create_access_token(data={"sub": str(user.id)})
                
                return TokenType(access_token=access_token, token_type="bearer")
                
        except Exception as e:
            raise Exception(f"Login failed: {str(e)}")
    
    @strawberry.mutation
    def update_profile(self, token: str, user_update: UserUpdateInput) -> UserType:
        """Update user profile."""
        try:
            # Decode token to get user ID
            from app.auth.jwt_handler import decode_token
            payload = decode_token(token)
            if not payload:
                raise Exception("Invalid token")
            
            user_id = payload.get("sub")
            if not user_id:
                raise Exception("Invalid token")
            
            from app.database import get_db_session_sync
            with get_db_session_sync() as db:
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    raise Exception("User not found")
                
                # Update user fields
                if user_update.full_name is not None:
                    user.full_name = user_update.full_name
                if user_update.avatar_url is not None:
                    user.avatar_url = user_update.avatar_url
                
                db.commit()
                db.refresh(user)
                
                return UserType(
                    id=user.id,
                    email=user.email,
                    full_name=user.full_name,
                    avatar_url=user.avatar_url,
                    created_at=user.created_at,
                    updated_at=user.updated_at
                )
                
        except Exception as e:
            raise Exception(f"Update failed: {str(e)}")
