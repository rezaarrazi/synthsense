from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models.persona import Persona, PersonaGenerationJob
from app.schemas.persona import PersonaGenerationJobCreate, PersonaGenerationJobResponse, PersonaResponse
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/personas", tags=["personas"])


@router.get("/groups", response_model=List[str])
async def get_persona_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of available persona groups."""
    result = await db.execute(
        select(PersonaGenerationJob.persona_group)
        .where(PersonaGenerationJob.status == "completed")
        .distinct()
        .order_by(PersonaGenerationJob.persona_group)
    )
    groups = result.scalars().all()
    
    return list(groups)


@router.get("/generation-jobs", response_model=List[PersonaGenerationJobResponse])
async def get_persona_generation_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get persona generation jobs for current user."""
    result = await db.execute(
        select(PersonaGenerationJob).where(
            or_(
                PersonaGenerationJob.user_id == current_user.id,
                PersonaGenerationJob.user_id.is_(None)  # Default personas
            )
        ).order_by(PersonaGenerationJob.created_at.desc())
    )
    jobs = result.scalars().all()
    
    return jobs


@router.get("/generation-jobs/{job_id}", response_model=PersonaGenerationJobResponse)
async def get_persona_generation_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific persona generation job."""
    result = await db.execute(
        select(PersonaGenerationJob).where(
            PersonaGenerationJob.id == job_id,
            or_(
                PersonaGenerationJob.user_id == current_user.id,
                PersonaGenerationJob.user_id.is_(None)  # Default personas
            )
        )
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona generation job not found"
        )
    
    return job


@router.post("/generate-cohort", response_model=PersonaGenerationJobResponse)
async def generate_custom_cohort(
    cohort_data: PersonaGenerationJobCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate a custom persona cohort."""
    # Check for existing persona groups for this user
    existing_result = await db.execute(
        select(PersonaGenerationJob).where(
            PersonaGenerationJob.user_id == current_user.id,
            PersonaGenerationJob.persona_group.ilike(f"{cohort_data.persona_group}%")
        )
    )
    existing_jobs = existing_result.scalars().all()
    
    # Determine the next available number
    final_persona_group = cohort_data.persona_group
    if existing_jobs:
        existing_names = [job.persona_group for job in existing_jobs]
        
        if final_persona_group in existing_names:
            counter = 2
            while f"{cohort_data.persona_group} ({counter})" in existing_names:
                counter += 1
            final_persona_group = f"{cohort_data.persona_group} ({counter})"
    
    # Create generation job
    job = PersonaGenerationJob(
        user_id=current_user.id,
        audience_description=cohort_data.audience_description,
        persona_group=final_persona_group,
        short_description="Custom cohort",
        source="ai_generated",
        status="generating",
        personas_generated=0,
        total_personas=100
    )
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # TODO: Start background generation task
    
    return job


@router.get("/by-group/{persona_group}", response_model=List[PersonaResponse])
async def get_personas_by_group(
    persona_group: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get personas by group name."""
    # First get the generation job for this group
    job_result = await db.execute(
        select(PersonaGenerationJob).where(
            PersonaGenerationJob.persona_group == persona_group,
            or_(
                PersonaGenerationJob.user_id == current_user.id,
                PersonaGenerationJob.user_id.is_(None)  # Default personas
            )
        )
    )
    job = job_result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona group '{persona_group}' not found"
        )
    
    # Get personas from this job
    personas_result = await db.execute(
        select(Persona).where(Persona.generation_job_id == job.id)
    )
    personas = personas_result.scalars().all()
    
    return personas
