import strawberry
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from uuid import uuid4
from app.models.experiment import Experiment
from app.models.persona import Persona, PersonaGenerationJob
from app.models.survey import SurveyResponse, PersonaConversation, PersonaMessage
from app.services.simulation_service import SimulationService
from app.services.persona_service import PersonaService
from app.services.ai_service import PersonaChatChain
from app.graphql.schema import (
    ExperimentCreateInput, PersonaGenerationJobCreateInput,
    PersonaConversationCreateInput, PersonaMessageCreateInput,
    SimulationResultType, ChatResponseType
)


@strawberry.type
class SimulationMutation:
    @strawberry.mutation
    async def run_simulation(
        self,
        info,
        experiment_data: ExperimentCreateInput
    ) -> SimulationResultType:
        """Run a simulation with personas."""
        user = info.context.get("user")
        if not user:
            raise Exception("Authentication required")
        
        db: AsyncSession = info.context.get("db")
        
        # Get personas from the specified group
        job_result = await db.execute(
            select(PersonaGenerationJob).where(
                PersonaGenerationJob.persona_group == experiment_data.persona_group,
                or_(
                    PersonaGenerationJob.user_id == user.id,
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
            user_id=user.id,
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
                    user_id=user.id,
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
                title=None  # Will be set later
            )
            
        except Exception as e:
            experiment.status = "failed"
            await db.commit()
            raise Exception(f"Simulation failed: {str(e)}")
    
    @strawberry.mutation
    async def chat_with_persona(
        self,
        info,
        conversation_id: strawberry.ID,
        persona_id: strawberry.ID,
        message: str
    ) -> ChatResponseType:
        """Chat with a persona."""
        user = info.context.get("user")
        if not user:
            raise Exception("Authentication required")
        
        db: AsyncSession = info.context.get("db")
        
        # Verify conversation belongs to user
        conv_result = await db.execute(
            select(PersonaConversation).where(
                PersonaConversation.id == conversation_id,
                PersonaConversation.user_id == user.id
            )
        )
        conversation = conv_result.scalar_one_or_none()
        
        if not conversation:
            raise Exception("Conversation not found or unauthorized")
        
        # Get persona with survey response
        persona_result = await db.execute(
            select(Persona).where(Persona.id == persona_id)
        )
        persona = persona_result.scalar_one_or_none()
        
        if not persona:
            raise Exception("Persona not found")
        
        # Get survey response for this persona and experiment
        survey_result = await db.execute(
            select(SurveyResponse).where(
                SurveyResponse.persona_id == persona_id,
                SurveyResponse.experiment_id == conversation.experiment_id
            )
        )
        survey_response = survey_result.scalar_one_or_none()
        
        if not survey_response:
            raise Exception("This persona hasn't participated in any experiments yet")
        
        # Get conversation history
        messages_result = await db.execute(
            select(PersonaMessage).where(
                PersonaMessage.conversation_id == conversation_id
            ).order_by(PersonaMessage.created_at).limit(10)
        )
        messages = messages_result.scalars().all()
        
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        # Save user message
        user_message = PersonaMessage(
            conversation_id=conversation_id,
            role="user",
            content=message
        )
        db.add(user_message)
        await db.commit()
        
        # Generate persona response
        chat_service = PersonaChatChain()
        
        response_text = await chat_service.chat_with_persona(
            persona_profile=persona.persona_data,
            initial_response=survey_response.response_text,
            likert_score=survey_response.likert,
            idea_text="",  # Will be filled from experiment
            conversation_history=conversation_history,
            user_message=message
        )
        
        # Save assistant response
        assistant_message = PersonaMessage(
            conversation_id=conversation_id,
            role="assistant",
            content=response_text
        )
        db.add(assistant_message)
        await db.commit()
        
        return ChatResponseType(
            message=response_text,
            conversation_id=conversation_id
        )
