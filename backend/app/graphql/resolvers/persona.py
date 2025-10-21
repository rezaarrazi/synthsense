import strawberry
from typing import Optional, List
from sqlalchemy import select, or_
from app.models.persona import Persona, PersonaGenerationJob
from app.graphql.schema import PersonaType, PersonaGenerationJobType


@strawberry.type
class PersonaQuery:
    @strawberry.field
    def persona_groups(self) -> List[str]:
        """Get list of available persona groups."""
        from app.database import get_db_session_sync
        with get_db_session_sync() as db:
            result = db.execute(
                select(PersonaGenerationJob.persona_group)
                .where(PersonaGenerationJob.status == "completed")
                .distinct()
                .order_by(PersonaGenerationJob.persona_group)
            )
            groups = result.scalars().all()
            return list(groups)
    
    @strawberry.field
    def persona_generation_job(
        self,
        token: str,
        id: strawberry.ID
    ) -> Optional[PersonaGenerationJobType]:
        """Get persona generation job by ID."""
        try:
            # Decode token to get user ID
            from app.auth.jwt_handler import decode_token
            payload = decode_token(token)
            if not payload:
                return None
            
            user_id = payload.get("sub")
            if not user_id:
                return None
            
            from app.database import get_db_session_sync
            with get_db_session_sync() as db:
                result = db.execute(
                    select(PersonaGenerationJob).where(
                        PersonaGenerationJob.id == id,
                        or_(
                            PersonaGenerationJob.user_id == user_id,
                            PersonaGenerationJob.user_id.is_(None)  # Default personas
                        )
                    )
                )
                job = result.scalar_one_or_none()
                
                if not job:
                    print(f"Job {id} not found for user {user_id}")
                    return None
                
                print(f"GraphQL resolver found job {id}: status={job.status}, personas_generated={job.personas_generated}")
                
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
        except Exception:
            return None
    
    @strawberry.field
    def personas_by_group(
        self,
        token: str,
        persona_group: str
    ) -> List[PersonaType]:
        """Get personas by group name."""
        try:
            # Decode token to get user ID
            from app.auth.jwt_handler import decode_token
            payload = decode_token(token)
            if not payload:
                return []
            
            user_id = payload.get("sub")
            if not user_id:
                return []
            
            from app.database import get_db_session_sync
            with get_db_session_sync() as db:
                # First get the generation job for this group
                job_result = db.execute(
                    select(PersonaGenerationJob).where(
                        PersonaGenerationJob.persona_group == persona_group,
                        or_(
                            PersonaGenerationJob.user_id == user_id,
                            PersonaGenerationJob.user_id.is_(None)  # Default personas
                        )
                    )
                )
                job = job_result.scalar_one_or_none()
                
                if not job:
                    return []
                
                # Get personas from this job
                personas_result = db.execute(
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
        except Exception:
            return []
