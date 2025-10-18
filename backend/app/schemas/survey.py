from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID


class SurveyResponseCreate(BaseModel):
    experiment_id: UUID
    persona_id: UUID
    response_text: str
    likert: int
    response_metadata: Optional[Dict[str, Any]] = None


class SurveyResponseResponse(BaseModel):
    id: UUID
    experiment_id: UUID
    persona_id: UUID
    user_id: UUID
    response_text: str
    likert: int
    response_metadata: Optional[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True


class PersonaConversationCreate(BaseModel):
    experiment_id: UUID
    persona_id: UUID


class PersonaConversationResponse(BaseModel):
    id: UUID
    experiment_id: UUID
    persona_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PersonaMessageCreate(BaseModel):
    conversation_id: UUID
    role: str
    content: str


class PersonaMessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True
