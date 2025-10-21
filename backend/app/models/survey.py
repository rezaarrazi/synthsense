from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class SurveyResponse(Base):
    __tablename__ = "survey_responses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    experiment_id = Column(UUID(as_uuid=True), ForeignKey("experiments.id"), nullable=False)
    persona_id = Column(UUID(as_uuid=True), ForeignKey("personas.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    response_text = Column(Text, nullable=False)
    likert = Column(Integer, nullable=False)  # 1-5 scale
    response_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    experiment = relationship("Experiment", back_populates="survey_responses")
    persona = relationship("Persona", back_populates="survey_responses")
    user = relationship("User", back_populates="survey_responses")


