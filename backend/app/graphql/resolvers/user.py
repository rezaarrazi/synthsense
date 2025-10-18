import strawberry
from typing import Optional
from app.models.user import User
from app.graphql.schema import UserType


@strawberry.type
class UserQuery:
    @strawberry.field
    async def me(self, info) -> Optional[UserType]:
        """Get current user information."""
        # Get user from context (set by GraphQL context)
        user = info.context.get("user")
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
