import strawberry
from typing import Optional
from app.models.user import User
from app.graphql.schema import UserType


@strawberry.type
class UserQuery:
    @strawberry.field
    async def me(self, token: str) -> Optional[UserType]:
        """Get current user information."""
        try:
            # Decode token to get user ID
            from app.auth.jwt_handler import decode_token
            payload = decode_token(token)
            if not payload:
                return None
            
            user_id = payload.get("sub")
            if not user_id:
                return None
            
            # Use synchronous database session like your working example
            from app.database import get_db_session_sync
            with get_db_session_sync() as db:
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    return None
                
                return UserType(
                    id=user.id,
                    email=user.email,
                    full_name=user.full_name,
                    avatar_url=user.avatar_url,
                    created_at=user.created_at,
                    updated_at=user.updated_at
                )
        except Exception:
            return None
