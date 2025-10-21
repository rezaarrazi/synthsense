import strawberry
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.experiment import Experiment
from app.models.survey import SurveyResponse
from app.graphql.schema import ExperimentType


@strawberry.type
class ExperimentMutation:
    @strawberry.mutation
    async def delete_experiment(
        self,
        token: str,
        experiment_id: strawberry.ID
    ) -> bool:
        """Delete an experiment and all its associated data."""
        try:
            # Decode token to get user ID
            from app.auth.jwt_handler import decode_token
            payload = decode_token(token)
            if not payload:
                raise Exception("Invalid token")
            
            user_id = payload.get("sub")
            if not user_id:
                raise Exception("Invalid token")
            
            # Use async database session
            from app.database import AsyncSessionLocal
            async with AsyncSessionLocal() as db:
                # First verify the experiment belongs to the user
                experiment_result = await db.execute(
                    select(Experiment).where(
                        Experiment.id == experiment_id,
                        Experiment.user_id == user_id
                    )
                )
                experiment = experiment_result.scalar_one_or_none()
                
                if not experiment:
                    raise Exception("Experiment not found or unauthorized")
                
                # Delete all survey responses for this experiment
                await db.execute(
                    delete(SurveyResponse).where(
                        SurveyResponse.experiment_id == experiment_id
                    )
                )
                
                # Delete the experiment itself
                await db.execute(
                    delete(Experiment).where(
                        Experiment.id == experiment_id,
                        Experiment.user_id == user_id
                    )
                )
                
                await db.commit()
                return True
                
        except Exception as e:
            raise Exception(f"Failed to delete experiment: {str(e)}")
    
    @strawberry.mutation
    async def update_experiment_title(
        self,
        token: str,
        experiment_id: strawberry.ID,
        title: str
    ) -> Optional[ExperimentType]:
        """Update an experiment's title."""
        try:
            # Decode token to get user ID
            from app.auth.jwt_handler import decode_token
            payload = decode_token(token)
            if not payload:
                raise Exception("Invalid token")
            
            user_id = payload.get("sub")
            if not user_id:
                raise Exception("Invalid token")
            
            # Use async database session
            from app.database import AsyncSessionLocal
            async with AsyncSessionLocal() as db:
                # Get the experiment
                experiment_result = await db.execute(
                    select(Experiment).where(
                        Experiment.id == experiment_id,
                        Experiment.user_id == user_id
                    )
                )
                experiment = experiment_result.scalar_one_or_none()
                
                if not experiment:
                    raise Exception("Experiment not found or unauthorized")
                
                # Update the title
                experiment.title = title
                await db.commit()
                await db.refresh(experiment)
                
                return ExperimentType(
                    id=experiment.id,
                    user_id=experiment.user_id,
                    idea_text=experiment.idea_text,
                    question_text=experiment.question_text,
                    status=experiment.status,
                    title=experiment.title,
                    persona_count=experiment.persona_count,
                    results_summary=experiment.results_summary,
                    recommended_next_step=experiment.recommended_next_step,
                    created_at=experiment.created_at,
                    updated_at=experiment.updated_at
                )
                
        except Exception as e:
            raise Exception(f"Failed to update experiment: {str(e)}")
