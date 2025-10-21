import strawberry
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import uuid4, UUID
from datetime import datetime
from app.models.persona import PersonaGenerationJob
from app.models.experiment import Experiment
from app.models.persona import Persona
from app.models.user import User
from app.services.persona_service import PersonaService
from app.services.ai_service import PersonaChatChain
from app.config import settings
from app.graphql.schema import (
    PersonaGenerationJobCreateInput, PersonaGenerationJobType,
    PersonaMessageType, ChatResponseType, ChatStreamChunkType
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

    @strawberry.mutation
    async def get_conversation_messages(
        self,
        info,
        token: str,
        conversation_id: str
    ) -> List[PersonaMessageType]:
        """Get messages for a conversation from LangGraph's checkpointer."""
        # Decode token to get user ID
        from app.auth.jwt_handler import decode_token
        payload = decode_token(token)
        if not payload:
            raise Exception("Authentication required")
        
        user_id = payload.get("sub")
        if not user_id:
            raise Exception("Authentication required")
        
        from app.database import get_db_session_sync
        with get_db_session_sync() as db:
            # Get user
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise Exception("User not found")
            
            # Get messages from LangGraph's checkpointer
            from psycopg_pool import AsyncConnectionPool
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
            from langgraph.graph import StateGraph, MessagesState, START, END
            
            # Convert SQLAlchemy URL to psycopg URL for AsyncPostgresSaver
            db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
            
            # Create connection pool for AsyncPostgresSaver
            pool = AsyncConnectionPool(db_url, kwargs={"autocommit": True, "prepare_threshold": None})
            
            async with pool.connection() as conn:
                checkpointer = AsyncPostgresSaver(conn)
                await checkpointer.setup()
                
                # Build a simple graph to access the checkpointer
                builder = StateGraph(MessagesState)
                builder.add_node("dummy", lambda state: state)  # Dummy node
                builder.add_edge(START, "dummy")
                builder.add_edge("dummy", END)
                graph = builder.compile(checkpointer=checkpointer)
                
                # Configure thread for this conversation
                config = {
                    "configurable": {
                        "thread_id": conversation_id
                    }
                }
                
                # Get the current state from the checkpointer
                try:
                    state = await graph.aget_state(config)
                    if state and state.values and "messages" in state.values:
                        messages = state.values["messages"]
                        
                        # Convert LangGraph messages to our format
                        result_messages = []
                        for i, msg in enumerate(messages):
                            # Skip system messages
                            if hasattr(msg, 'type') and msg.type == 'system':
                                continue
                                
                            # Determine role based on message type
                            role = "user" if hasattr(msg, 'type') and msg.type == 'human' else "assistant"
                            
                            result_messages.append(PersonaMessageType(
                                id=f"{conversation_id}-{i}",  # Generate a simple ID
                                conversation_id=conversation_id,
                                role=role,
                                content=msg.content,
                                created_at=datetime.now()  # LangGraph doesn't store timestamps, use current time
                            ))
                        
                        return result_messages
                    else:
                        return []
                        
                except Exception as e:
                    # If no state exists yet, return empty list
                    return []

    @strawberry.mutation
    async def chat_with_persona(
        self,
        info,
        token: str,
        conversation_id: str,
        persona_id: str,
        message: str
    ) -> ChatResponseType:
        """Chat with a persona using LangGraph's checkpointer."""
        # Decode token to get user ID
        from app.auth.jwt_handler import decode_token
        payload = decode_token(token)
        if not payload:
            raise Exception("Authentication required")
        
        user_id = payload.get("sub")
        if not user_id:
            raise Exception("Authentication required")
        
        from app.database import get_db_session_sync
        with get_db_session_sync() as db:
            # Get user
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise Exception("User not found")
            
            # Get persona
            persona_result = db.query(Persona).filter(Persona.id == persona_id).first()
            
            if not persona_result:
                raise Exception("Persona not found")
            
            # Get survey response for this persona (get the most recent one)
            from app.models.survey import SurveyResponse
            survey_response = db.query(SurveyResponse).filter(
                SurveyResponse.persona_id == persona_id
            ).order_by(SurveyResponse.created_at.desc()).first()
            
            if not survey_response:
                raise Exception("Persona hasn't participated in any experiments yet")
            
            # Get experiment details
            experiment = db.query(Experiment).filter(
                Experiment.id == survey_response.experiment_id
            ).first()
            
            if not experiment:
                raise Exception("Experiment not found")
            
            # Generate AI response using LangGraph (which handles conversation persistence)
            chat_chain = PersonaChatChain()
            
            ai_response = await chat_chain.chat_with_persona(
                persona_profile=persona_result.persona_data,
                initial_response=survey_response.response_text,
                likert_score=survey_response.likert,
                idea_text=experiment.idea_text,
                user_message=message,
                conversation_id=conversation_id
            )
            
            return ChatResponseType(
                message=ai_response,
                conversation_id=conversation_id
            )

        @strawberry.mutation
        async def chat_with_persona_stream(
            self,
            info,
            token: str,
            conversation_id: str,
            persona_id: str,
            message: str
        ):
            """Stream chat with a persona using LangGraph's checkpointer."""
            # Decode token to get user ID
            from app.auth.jwt_handler import decode_token
            payload = decode_token(token)
            if not payload:
                raise Exception("Authentication required")
            
            user_id = payload.get("sub")
            if not user_id:
                raise Exception("Authentication required")
            
            from app.database import get_db_session_sync
            with get_db_session_sync() as db:
                # Get user
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    raise Exception("User not found")
                
                # Get persona
                persona_result = db.query(Persona).filter(Persona.id == persona_id).first()
                
                if not persona_result:
                    raise Exception("Persona not found")
                
                # Get survey response for this persona (get the most recent one)
                from app.models.survey import SurveyResponse
                survey_response = db.query(SurveyResponse).filter(
                    SurveyResponse.persona_id == persona_id
                ).order_by(SurveyResponse.created_at.desc()).first()
                
                if not survey_response:
                    raise Exception("Persona hasn't participated in any experiments yet")
                
                # Get experiment details
                experiment = db.query(Experiment).filter(
                    Experiment.id == survey_response.experiment_id
                ).first()
                
                if not experiment:
                    raise Exception("Experiment not found")
                
                # Generate streaming AI response using LangGraph
                chat_chain = PersonaChatChain()
                
                async for chunk_content in chat_chain.chat_with_persona_stream(
                    persona_profile=persona_result.persona_data,
                    initial_response=survey_response.response_text,
                    likert_score=survey_response.likert,
                    idea_text=experiment.idea_text,
                    user_message=message,
                    conversation_id=conversation_id
                ):
                    yield ChatStreamChunkType(
                        content=chunk_content,
                        conversation_id=conversation_id,
                        is_final=False
                    )
                
                # Send final chunk
                yield ChatStreamChunkType(
                    content="",
                    conversation_id=conversation_id,
                    is_final=True
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
