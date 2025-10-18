import strawberry
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.auth.password_handler import hash_password, verify_password
from app.auth.jwt_handler import create_access_token
from app.graphql.schema import UserCreateInput, UserLoginInput, UserUpdateInput, TokenType, UserType


@strawberry.type
class AuthMutation:
    @strawberry.mutation
    async def signup(
        self,
        info,
        user_data: UserCreateInput
    ) -> TokenType:
        """Create a new user account."""
        db: AsyncSession = info.context.get("db")
        
        # Check if user already exists
        result = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        existing_user = result.scalar_one_or_none()
        
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
        await db.commit()
        await db.refresh(user)
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return TokenType(access_token=access_token, token_type="bearer")
    
    @strawberry.mutation
    async def login(
        self,
        info,
        credentials: UserLoginInput
    ) -> TokenType:
        """Authenticate user and return access token."""
        db: AsyncSession = info.context.get("db")
        
        # Find user by email
        result = await db.execute(
            select(User).where(User.email == credentials.email)
        )
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(credentials.password, user.hashed_password):
            raise Exception("Incorrect email or password")
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return TokenType(access_token=access_token, token_type="bearer")
    
    @strawberry.mutation
    async def update_profile(
        self,
        info,
        user_update: UserUpdateInput
    ) -> UserType:
        """Update user profile."""
        user = info.context.get("user")
        if not user:
            raise Exception("Authentication required")
        
        db: AsyncSession = info.context.get("db")
        
        # Update user fields
        if user_update.full_name is not None:
            user.full_name = user_update.full_name
        if user_update.avatar_url is not None:
            user.avatar_url = user_update.avatar_url
        
        await db.commit()
        await db.refresh(user)
        
        return UserType(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
