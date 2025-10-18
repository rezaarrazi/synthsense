import strawberry
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.persona import Persona, PersonaGenerationJob
from app.graphql.schema import PersonaType, PersonaGenerationJobType


@strawberry.type
class PersonaQuery:
    @strawberry.field
    async def persona_groups(self, info) -> List[str]:
        """Get list of available persona groups."""
        db: AsyncSession = info.context.get("db")
        
        result = await db.execute(
            select(PersonaGenerationJob.persona_group)
            .where(PersonaGenerationJob.status == "completed")
            .distinct()
            .order_by(PersonaGenerationJob.persona_group)
        )
        groups = result.scalars().all()
        
        return list(groups)
    
    @strawberry.field
    async def persona_generation_job(
        self,
        info,
        id: strawberry.ID
    ) -> Optional[PersonaGenerationJobType]:
        """Get persona generation job by ID."""
        user = info.context.get("user")
        if not user:
            return None
        
        db: AsyncSession = info.context.get("db")
        
        result = await db.execute(
            select(PersonaGenerationJob).where(
                PersonaGenerationJob.id == id,
                or_(
                    PersonaGenerationJob.user_id == user.id,
                    PersonaGenerationJob.user_id.is_(None)  # Default personas
                )
            )
        )
        job = result.scalar_one_or_none()
        
        if not job:
            return None
        
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
    
    @strawberry.field
    async def personas_by_group(
        self,
        info,
        persona_group: str
    ) -> List[PersonaType]:
        """Get personas by group name."""
        user = info.context.get("user")
        if not user:
            return []
        
        db: AsyncSession = info.context.get("db")
        
        # First get the generation job for this group
        job_result = await db.execute(
            select(PersonaGenerationJob).where(
                PersonaGenerationJob.persona_group == persona_group,
                or_(
                    PersonaGenerationJob.user_id == user.id,
                    PersonaGenerationJob.user_id.is_(None)  # Default personas
                )
            )
        )
        job = job_result.scalar_one_or_none()
        
        if not job:
            return []
        
        # Get personas from this job
        personas_result = await db.execute(
            select(Persona).where(Persona.generation_job_id == job.id)
        )
        personas = personas_result.scalars().all()
        
        return [
            PersonaType(
                id=persona.id,
                user_id=persona.user_id,
                generation_job_id=persona.generation_job_id,
                persona_name=persona.persona_name,
                persona_data=persona.persona_data,
                created_at=persona.created_at,
                updated_at=persona.updated_at
            )
            for persona in personas
        ]
