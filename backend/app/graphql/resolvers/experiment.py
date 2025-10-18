import strawberry
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.experiment import Experiment
from app.models.survey import SurveyResponse
from app.graphql.schema import ExperimentType, SurveyResponseType


@strawberry.type
class ExperimentQuery:
    @strawberry.field
    async def experiments(
        self, 
        info,
        status: Optional[str] = None
    ) -> List[ExperimentType]:
        """Get list of experiments for current user."""
        user = info.context.get("user")
        if not user:
            return []
        
        db: AsyncSession = info.context.get("db")
        
        query = select(Experiment).where(Experiment.user_id == user.id)
        if status:
            query = query.where(Experiment.status == status)
        query = query.order_by(Experiment.created_at.desc())
        
        result = await db.execute(query)
        experiments = result.scalars().all()
        
        return [
            ExperimentType(
                id=exp.id,
                user_id=exp.user_id,
                idea_text=exp.idea_text,
                question_text=exp.question_text,
                status=exp.status,
                title=exp.title,
                persona_count=exp.persona_count,
                results_summary=exp.results_summary,
                recommended_next_step=exp.recommended_next_step,
                created_at=exp.created_at,
                updated_at=exp.updated_at
            )
            for exp in experiments
        ]
    
    @strawberry.field
    async def experiment(
        self, 
        info,
        id: strawberry.ID
    ) -> Optional[ExperimentType]:
        """Get a single experiment by ID."""
        user = info.context.get("user")
        if not user:
            return None
        
        db: AsyncSession = info.context.get("db")
        
        result = await db.execute(
            select(Experiment).where(
                Experiment.id == id,
                Experiment.user_id == user.id
            )
        )
        experiment = result.scalar_one_or_none()
        
        if not experiment:
            return None
        
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
    
    @strawberry.field
    async def experiment_responses(
        self,
        info,
        experiment_id: strawberry.ID
    ) -> List[SurveyResponseType]:
        """Get survey responses for an experiment."""
        user = info.context.get("user")
        if not user:
            return []
        
        db: AsyncSession = info.context.get("db")
        
        result = await db.execute(
            select(SurveyResponse).where(
                SurveyResponse.experiment_id == experiment_id,
                SurveyResponse.user_id == user.id
            ).order_by(SurveyResponse.created_at)
        )
        responses = result.scalars().all()
        
        return [
            SurveyResponseType(
                id=resp.id,
                experiment_id=resp.experiment_id,
                persona_id=resp.persona_id,
                user_id=resp.user_id,
                response_text=resp.response_text,
                likert=resp.likert,
                response_metadata=resp.response_metadata,
                created_at=resp.created_at
            )
            for resp in responses
        ]
