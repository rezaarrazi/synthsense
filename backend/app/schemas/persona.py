from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID


class PersonaGenerationJobCreate(BaseModel):
    audience_description: str
    persona_group: str


class PersonaGenerationJobResponse(BaseModel):
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
    
    class Config:
        from_attributes = True


class PersonaResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    generation_job_id: UUID
    persona_name: str
    persona_data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
