from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.persona import Persona
from app.models.experiment import Experiment
from app.models.survey import SurveyResponse
from app.models.user import User
from app.services.ai_service import PersonaChatChain
from app.auth.jwt_handler import decode_token
import json
import asyncio

router = APIRouter()

@router.get("/chat-stream/{conversation_id}")
async def stream_chat(
    conversation_id: str,
    persona_id: str,
    message: str,
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Stream chat response using Server-Sent Events."""
    
    # Decode token to get user ID
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Get user
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get persona
    persona_result = await db.execute(select(Persona).where(Persona.id == persona_id))
    persona = persona_result.scalar_one_or_none()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Get survey response for this persona (get the most recent one)
    survey_result = await db.execute(
        select(SurveyResponse)
        .where(SurveyResponse.persona_id == persona_id)
        .order_by(SurveyResponse.created_at.desc())
        .limit(1)
    )
    survey_response = survey_result.scalar_one_or_none()
    if not survey_response:
        raise HTTPException(status_code=404, detail="Persona hasn't participated in any experiments yet")
    
    # Get experiment details
    experiment_result = await db.execute(
        select(Experiment).where(Experiment.id == survey_response.experiment_id)
    )
    experiment = experiment_result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    async def generate_stream():
        try:
            # Generate streaming AI response using LangGraph
            chat_chain = PersonaChatChain()
            
            async for chunk_content in chat_chain.chat_with_persona_stream(
                persona_profile=persona.persona_data,
                initial_response=survey_response.response_text,
                likert_score=survey_response.likert,
                idea_text=experiment.idea_text,
                user_message=message,
                conversation_id=conversation_id
            ):
                # Send chunk as SSE
                data = {
                    "content": chunk_content,
                    "conversation_id": conversation_id,
                    "is_final": False
                }
                yield f"data: {json.dumps(data)}\n\n"
                await asyncio.sleep(0.01)  # Small delay to prevent overwhelming the client
            
            # Send final chunk
            final_data = {
                "content": "",
                "conversation_id": conversation_id,
                "is_final": True
            }
            yield f"data: {json.dumps(final_data)}\n\n"
            
        except Exception as e:
            error_data = {
                "error": str(e),
                "conversation_id": conversation_id,
                "is_final": True
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )
