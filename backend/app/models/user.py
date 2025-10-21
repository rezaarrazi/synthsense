from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    experiments = relationship("Experiment", back_populates="user", cascade="all, delete-orphan")
    personas = relationship("Persona", back_populates="user", cascade="all, delete-orphan")
    persona_generation_jobs = relationship("PersonaGenerationJob", back_populates="user", cascade="all, delete-orphan")
    survey_responses = relationship("SurveyResponse", back_populates="user", cascade="all, delete-orphan")
