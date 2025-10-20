import strawberry
from typing import Optional, List
from sqlalchemy import select
from app.models.experiment import Experiment
from app.models.survey import SurveyResponse
from app.graphql.schema import ExperimentType, SurveyResponseType


@strawberry.type
class ExperimentQuery:
    @strawberry.field
    def experiments(
        self, 
        token: str,
        status: Optional[str] = None
    ) -> List[ExperimentType]:
        """Get list of experiments for current user."""
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
                query = select(Experiment).where(Experiment.user_id == user_id)
                if status:
                    query = query.where(Experiment.status == status)
                query = query.order_by(Experiment.created_at.desc())
                
                result = db.execute(query)
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
        except Exception:
            return []
    
    @strawberry.field
    def experiment(
        self, 
        token: str,
        id: strawberry.ID
    ) -> Optional[ExperimentType]:
        """Get a single experiment by ID."""
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
                    select(Experiment).where(
                        Experiment.id == id,
                        Experiment.user_id == user_id
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
        except Exception:
            return None
    
    @strawberry.field
    def experiment_responses(
        self,
        token: str,
        experiment_id: strawberry.ID
    ) -> List[SurveyResponseType]:
        """Get survey responses for an experiment."""
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
                result = db.execute(
                    select(SurveyResponse).where(
                        SurveyResponse.experiment_id == experiment_id,
                        SurveyResponse.user_id == user_id
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
        except Exception:
            return []
