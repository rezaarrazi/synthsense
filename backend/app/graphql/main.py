"""
Main GraphQL schema combining queries and mutations.
"""
import strawberry
from strawberry.fastapi import GraphQLRouter
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.graphql.resolvers.user import UserQuery
from app.graphql.resolvers.experiment import ExperimentQuery
from app.graphql.resolvers.persona import PersonaQuery
from app.graphql.mutations.auth import AuthMutation
from app.graphql.mutations.simulation import SimulationMutation
from app.graphql.mutations.persona import PersonaMutation
from app.graphql.mutations.experiment import ExperimentMutation
from app.database import get_db
from app.models.user import User
from app.auth.jwt_handler import decode_token


async def get_context(request: Request) -> dict:
    """Get GraphQL context with user and database session."""
    # Get database session
    db_gen = get_db()
    db = await db_gen.__anext__()
    
    # Extract user from Authorization header
    user = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = decode_token(token)
            if payload:
                user_id = payload.get("sub")
                if user_id:
                    # Get user from database
                    from sqlalchemy import select
                    result = await db.execute(select(User).where(User.id == user_id))
                    user = result.scalar_one_or_none()
        except Exception:
            pass
    
    return {
        "request": request,
        "db": db,
        "user": user
    }


@strawberry.type
class Query(UserQuery, ExperimentQuery, PersonaQuery):
    """Root query type combining all query resolvers."""
    pass


@strawberry.type
class Mutation(AuthMutation, SimulationMutation, PersonaMutation, ExperimentMutation):
    """Root mutation type combining all mutation resolvers."""
    pass


# Create the GraphQL schema
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation
)

# Create the GraphQL router for FastAPI with context getter
graphql_app = GraphQLRouter(schema, context_getter=get_context)
