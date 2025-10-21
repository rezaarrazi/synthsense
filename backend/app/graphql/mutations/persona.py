import strawberry
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import uuid4
from datetime import datetime
from app.models.persona import PersonaGenerationJob
from app.models.experiment import Experiment
from app.models.persona import Persona
from app.services.persona_service import PersonaService
from app.config import settings
from app.graphql.schema import (
    PersonaGenerationJobCreateInput, PersonaGenerationJobType
)


@strawberry.type
class PersonaMutation:
    @strawberry.mutation
    async def generate_custom_cohort(
        self,
        info,
        cohort_data: PersonaGenerationJobCreateInput
    ) -> PersonaGenerationJobType:
        """Generate a custom persona cohort."""
        user = info.context.get("user")
        if not user:
            raise Exception("Authentication required")
        
        db: AsyncSession = info.context.get("db")
        
        # Check for existing persona groups for this user
        existing_result = await db.execute(
            select(PersonaGenerationJob).where(
                PersonaGenerationJob.user_id == user.id,
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
            user_id=user.id,
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
        
        # Start background generation
        persona_service = PersonaService()
        
        # Run generation in background (in production, use a task queue)
        import asyncio
        asyncio.create_task(
            _generate_personas_background(
                persona_service, job.id, cohort_data.audience_description,
                final_persona_group, db
            )
        )
        
        return PersonaGenerationJobType(
            id=job.id,
            user_id=job.user_id,
            audience_description=job.audience_description,
            persona_group=job.persona_group,
            short_description=job.short_description,
            source=job.source,
            status=job.status,
            personas_generated=job.personas_generated,
            total_personas=job.total_personas,
            error_message=job.error_message,
            created_at=job.created_at,
            updated_at=job.updated_at
        )
    

async def _generate_personas_background(
    persona_service: PersonaService,
    job_id: str,
    audience_description: str,
    persona_group: str,
    db: AsyncSession
):
    """Background task to generate personas."""
    try:
        result = await persona_service.generate_custom_cohort(
            job_id=job_id,
            audience_description=audience_description,
            persona_group=persona_group,
            total_personas=100
        )
        
        # Update job status
        from app.models.persona import PersonaGenerationJob
        from sqlalchemy import select
        
        job_result = await db.execute(
            select(PersonaGenerationJob).where(PersonaGenerationJob.id == job_id)
        )
        job = job_result.scalar_one_or_none()
        
        if job:
            job.status = result["status"]
            job.personas_generated = result["personas_generated"]
            if result["status"] == "error":
                job.error_message = result["error_message"]
            
            await db.commit()
            
    except Exception as e:
        # Update job with error
        from app.models.persona import PersonaGenerationJob
        from sqlalchemy import select
        
        job_result = await db.execute(
            select(PersonaGenerationJob).where(PersonaGenerationJob.id == job_id)
        )
        job = job_result.scalar_one_or_none()
        
        if job:
            job.status = "failed"
            job.error_message = str(e)
            await db.commit()
