import strawberry
from typing import Optional, List
from datetime import datetime
from uuid import UUID


@strawberry.type
class UserType:
    id: UUID
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime
    updated_at: datetime


@strawberry.type
class ExperimentType:
    id: UUID
    user_id: UUID
    idea_text: str
    question_text: str
    status: str
    title: Optional[str]
    persona_count: int
    results_summary: Optional[strawberry.scalars.JSON]
    recommended_next_step: Optional[str]
    created_at: datetime
    updated_at: datetime


@strawberry.type
class PersonaGenerationJobType:
    id: UUID
    user_id: Optional[UUID]
    audience_description: str
    persona_group: str
    short_description: Optional[str]
    source: str
    status: str
    personas_generated: int
    total_personas: int
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime


@strawberry.type
class PersonaType:
    id: UUID
    user_id: Optional[UUID]
    generation_job_id: UUID
    persona_name: str
    persona_data: strawberry.scalars.JSON
    created_at: datetime
    updated_at: datetime


@strawberry.type
class SurveyResponseType:
    id: UUID
    experiment_id: UUID
    persona_id: UUID
    user_id: UUID
    response_text: str
    likert: int
    response_metadata: Optional[strawberry.scalars.JSON]
    created_at: datetime


@strawberry.type
class SurveyResponseWithPersonaType:
    id: UUID
    experiment_id: UUID
    persona_id: UUID
    user_id: UUID
    response_text: str
    likert: int
    response_metadata: Optional[strawberry.scalars.JSON]
    created_at: datetime
    persona: Optional[PersonaType]


# Input types for mutations
@strawberry.input
class UserCreateInput:
    email: str
    password: str
    full_name: Optional[str] = None


@strawberry.input
class UserLoginInput:
    email: str
    password: str


@strawberry.input
class UserUpdateInput:
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


@strawberry.input
class ExperimentCreateInput:
    idea_text: str
    question_text: str = "Based on this information, how likely are you to purchase this product?"
    persona_group: str


@strawberry.input
class PersonaGenerationJobCreateInput:
    audience_description: str
    persona_group: str


# Response types for mutations
@strawberry.type
class TokenType:
    access_token: str
    token_type: str = "bearer"


@strawberry.type
class LoginResponseType:
    access_token: str
    token_type: str = "bearer"
    user: UserType


@strawberry.type
class SimulationResultType:
    experiment_id: UUID
    status: str
    total_processed: int
    total_personas: int
    sentiment_breakdown: Optional[strawberry.scalars.JSON]
    property_distributions: Optional[strawberry.scalars.JSON]
    recommendation: Optional[str]
    title: Optional[str]


@strawberry.type
class PersonaMessageType:
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime


@strawberry.type
class ChatResponseType:
    message: str
    conversation_id: UUID


