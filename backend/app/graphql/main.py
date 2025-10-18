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


def get_context(request):
    """Get context for GraphQL resolvers."""
    return {
        "user": getattr(request.state, "user", None),
        "db": getattr(request.state, "db", None),
    }


# Create GraphQL schema
schema = strawberry.Schema(query=Query, mutation=Mutation)

# Create GraphQL router
graphql_app = GraphQLRouter(schema, context_getter=get_context)
