from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID


class ExperimentCreate(BaseModel):
    idea_text: str
    question_text: str = "Based on this information, how likely are you to purchase this product?"
    persona_group: str


class ExperimentUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    results_summary: Optional[Dict[str, Any]] = None
    recommended_next_step: Optional[str] = None


class ExperimentResponse(BaseModel):
    id: UUID
    user_id: UUID
    idea_text: str
    question_text: str
    status: str
    title: Optional[str]
    persona_count: int
    results_summary: Optional[Dict[str, Any]]
    recommended_next_step: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
