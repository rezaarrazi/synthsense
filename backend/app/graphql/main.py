"""
Main GraphQL schema combining queries and mutations.
"""
import strawberry
from strawberry.fastapi import GraphQLRouter
from app.graphql.resolvers.user import UserQuery
from app.graphql.resolvers.experiment import ExperimentQuery
from app.graphql.resolvers.persona import PersonaQuery
from app.graphql.mutations.auth import AuthMutation
from app.graphql.mutations.simulation import SimulationMutation
from app.graphql.mutations.persona import PersonaMutation


@strawberry.type
class Query(UserQuery, ExperimentQuery, PersonaQuery):
    """Root query type combining all query resolvers."""
    pass


@strawberry.type
class Mutation(AuthMutation, SimulationMutation, PersonaMutation):
    """Root mutation type combining all mutation resolvers."""
    pass


# Create the GraphQL schema
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation
)

# Create the GraphQL router for FastAPI
graphql_app = GraphQLRouter(schema)
