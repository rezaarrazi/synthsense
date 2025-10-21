from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Experiment(Base):
    __tablename__ = "experiments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    idea_text = Column(Text, nullable=False)
    question_text = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="draft")  # draft, in_progress, completed
    title = Column(String(255), nullable=True)
    persona_count = Column(Integer, nullable=False, default=0)
    results_summary = Column(JSON, nullable=True)
    recommended_next_step = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="experiments")
    survey_responses = relationship("SurveyResponse", back_populates="experiment", cascade="all, delete-orphan")
