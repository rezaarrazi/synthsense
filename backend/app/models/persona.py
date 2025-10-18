from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class PersonaGenerationJob(Base):
    __tablename__ = "persona_generation_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Nullable for default personas
    audience_description = Column(Text, nullable=False)
    persona_group = Column(String(255), nullable=False, index=True)
    short_description = Column(String(255), nullable=True)
    source = Column(String(50), nullable=False, default="ai_generated")  # ai_generated, manual
    status = Column(String(50), nullable=False, default="generating")  # generating, completed, failed
    personas_generated = Column(Integer, nullable=False, default=0)
    total_personas = Column(Integer, nullable=False, default=100)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="persona_generation_jobs")
    personas = relationship("Persona", back_populates="generation_job", cascade="all, delete-orphan")


class Persona(Base):
    __tablename__ = "personas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Nullable for default personas
    generation_job_id = Column(UUID(as_uuid=True), ForeignKey("persona_generation_jobs.id"), nullable=False)
    persona_name = Column(String(255), nullable=False)
    persona_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="personas")
    generation_job = relationship("PersonaGenerationJob", back_populates="personas")
    survey_responses = relationship("SurveyResponse", back_populates="persona", cascade="all, delete-orphan")
    persona_conversations = relationship("PersonaConversation", back_populates="persona", cascade="all, delete-orphan")
