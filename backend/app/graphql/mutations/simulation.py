import strawberry
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from uuid import uuid4
from app.models.experiment import Experiment
from app.models.persona import Persona, PersonaGenerationJob
from app.models.survey import SurveyResponse
from app.services.simulation_service import SimulationService
from app.services.persona_service import PersonaService
from app.services.ai_service import PersonaChatChain
from app.graphql.schema import (
    ExperimentCreateInput, PersonaGenerationJobCreateInput,
    SimulationResultType
)


@strawberry.type
class SimulationMutation:
    @strawberry.mutation
    async def run_simulation(
        self,
        token: str,
        experiment_data: ExperimentCreateInput
    ) -> SimulationResultType:
        """Run a simulation with personas."""
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
        
                # Get personas from the specified group
                job_result = await db.execute(
                    select(PersonaGenerationJob).where(
                        PersonaGenerationJob.persona_group == experiment_data.persona_group,
                        or_(
                            PersonaGenerationJob.user_id == user_id,
                            PersonaGenerationJob.user_id.is_(None)  # Default personas
                        )
                    )
                )
                job = job_result.scalar_one_or_none()
                
                if not job:
                    raise Exception(f"Persona group '{experiment_data.persona_group}' not found")
                
                personas_result = await db.execute(
                    select(Persona).where(Persona.generation_job_id == job.id)
                )
                personas = personas_result.scalars().all()
                
                if not personas:
                    raise Exception(f"No personas found for group '{experiment_data.persona_group}'")
                
                # Create experiment record
                experiment = Experiment(
                    user_id=user_id,
                    idea_text=experiment_data.idea_text,
                    question_text=experiment_data.question_text,
                    status="in_progress",
                    persona_count=len(personas)
                )
                
                db.add(experiment)
                await db.commit()
                await db.refresh(experiment)
        
                # Run simulation
                simulation_service = SimulationService()
                
                # Convert personas to dict format for simulation
                personas_data = [
                    {
                        "id": str(persona.id),
                        "persona_data": persona.persona_data
                    }
                    for persona in personas
                ]
                
                try:
                    result = await simulation_service.run_simulation(
                        experiment_id=str(experiment.id),
                        personas=personas_data,
                        idea_text=experiment_data.idea_text
                    )
                    
                    # Update experiment with results
                    experiment.status = result["status"]
                    experiment.title = result["title"]
                    experiment.results_summary = {
                        "sentiment_breakdown": result["sentiment_breakdown"],
                        "property_distributions": result["property_distributions"]
                    }
                    experiment.recommended_next_step = result["recommendation"]
                    
                    # Save survey responses
                    for response_data, score in zip(result["responses"], result["scores"]):
                        survey_response = SurveyResponse(
                            experiment_id=experiment.id,
                            persona_id=response_data["persona_id"],
                            user_id=user_id,
                            response_text=response_data["response_text"],
                            likert=score,
                            response_metadata={"persona_data": response_data["persona_data"]}
                        )
                        db.add(survey_response)
                    
                    await db.commit()
                    
                    return SimulationResultType(
                        experiment_id=experiment.id,
                        status=result["status"],
                        total_processed=len(result["responses"]),
                        total_personas=len(personas),
                        sentiment_breakdown=result["sentiment_breakdown"],
                        property_distributions=result["property_distributions"],
                        recommendation=result["recommendation"],
                        title=result["title"]
                    )
                    
                except Exception as e:
                    experiment.status = "failed"
                    await db.commit()
                    raise Exception(f"Simulation failed: {str(e)}")
                    
        except Exception as e:
            raise Exception(f"Simulation failed: {str(e)}")
