from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models.experiment import Experiment
from app.models.survey import SurveyResponse
from app.schemas.experiment import ExperimentCreate, ExperimentResponse, ExperimentUpdate
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.get("/", response_model=List[ExperimentResponse])
async def get_experiments(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of experiments for current user."""
    query = select(Experiment).where(Experiment.user_id == current_user.id)
    if status:
        query = query.where(Experiment.status == status)
    query = query.order_by(Experiment.created_at.desc())
    
    result = await db.execute(query)
    experiments = result.scalars().all()
    
    return experiments


@router.get("/{experiment_id}", response_model=ExperimentResponse)
async def get_experiment(
    experiment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single experiment by ID."""
    result = await db.execute(
        select(Experiment).where(
            Experiment.id == experiment_id,
            Experiment.user_id == current_user.id
        )
    )
    experiment = result.scalar_one_or_none()
    
    if not experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found"
        )
    
    return experiment


@router.post("/simulate", response_model=ExperimentResponse)
async def simulate_experiment(
    experiment_data: ExperimentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start a simulation experiment."""
    # This would integrate with the simulation service
    # For now, just create the experiment record
    experiment = Experiment(
        user_id=current_user.id,
        idea_text=experiment_data.idea_text,
        question_text=experiment_data.question_text,
        status="draft",
        persona_count=0
    )
    
    db.add(experiment)
    await db.commit()
    await db.refresh(experiment)
    
    return experiment


@router.put("/{experiment_id}", response_model=ExperimentResponse)
async def update_experiment(
    experiment_id: UUID,
    experiment_update: ExperimentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an experiment."""
    result = await db.execute(
        select(Experiment).where(
            Experiment.id == experiment_id,
            Experiment.user_id == current_user.id
        )
    )
    experiment = result.scalar_one_or_none()
    
    if not experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found"
        )
    
    # Update fields
    if experiment_update.title is not None:
        experiment.title = experiment_update.title
    if experiment_update.status is not None:
        experiment.status = experiment_update.status
    if experiment_update.results_summary is not None:
        experiment.results_summary = experiment_update.results_summary
    if experiment_update.recommended_next_step is not None:
        experiment.recommended_next_step = experiment_update.recommended_next_step
    
    await db.commit()
    await db.refresh(experiment)
    
    return experiment


@router.get("/{experiment_id}/responses", response_model=List[dict])
async def get_experiment_responses(
    experiment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get survey responses for an experiment."""
    result = await db.execute(
        select(SurveyResponse).where(
            SurveyResponse.experiment_id == experiment_id,
            SurveyResponse.user_id == current_user.id
        ).order_by(SurveyResponse.created_at)
    )
    responses = result.scalars().all()
    
    return [
        {
            "id": resp.id,
            "persona_id": resp.persona_id,
            "response_text": resp.response_text,
            "likert": resp.likert,
            "response_metadata": resp.response_metadata,
            "created_at": resp.created_at
        }
        for resp in responses
    ]
