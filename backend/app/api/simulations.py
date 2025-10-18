from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models.survey import PersonaConversation, PersonaMessage
from app.models.persona import Persona
from app.models.experiment import Experiment
from app.schemas.survey import PersonaConversationCreate, PersonaMessageCreate, PersonaConversationResponse, PersonaMessageResponse
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.ai_service import PersonaChatChain

router = APIRouter(prefix="/api/simulations", tags=["simulations"])


@router.post("/chat/{conversation_id}", response_model=PersonaMessageResponse)
async def chat_with_persona(
    conversation_id: UUID,
    message_data: PersonaMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Chat with a persona."""
    # Verify conversation belongs to user
    conv_result = await db.execute(
        select(PersonaConversation).where(
            PersonaConversation.id == conversation_id,
            PersonaConversation.user_id == current_user.id
        )
    )
    conversation = conv_result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or unauthorized"
        )
    
    # Get persona
    persona_result = await db.execute(
        select(Persona).where(Persona.id == conversation.persona_id)
    )
    persona = persona_result.scalar_one_or_none()
    
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona not found"
        )
    
    # Get experiment and survey response
    experiment_result = await db.execute(
        select(Experiment).where(Experiment.id == conversation.experiment_id)
    )
    experiment = experiment_result.scalar_one_or_none()
    
    if not experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found"
        )
    
    # Get survey response for this persona
    from app.models.survey import SurveyResponse
    survey_result = await db.execute(
        select(SurveyResponse).where(
            SurveyResponse.persona_id == persona.id,
            SurveyResponse.experiment_id == experiment.id
        )
    )
    survey_response = survey_result.scalar_one_or_none()
    
    if not survey_response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This persona hasn't participated in any experiments yet"
        )
    
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
        content=message_data.content
    )
    db.add(user_message)
    await db.commit()
    
    # Generate persona response
    chat_service = PersonaChatChain()
    
    response_text = await chat_service.chat_with_persona(
        persona_profile=persona.persona_data,
        initial_response=survey_response.response_text,
        likert_score=survey_response.likert,
        idea_text=experiment.idea_text,
        conversation_history=conversation_history,
        user_message=message_data.content,
        conversation_id=str(conversation_id)
    )
    
    # Save assistant response
    assistant_message = PersonaMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=response_text
    )
    db.add(assistant_message)
    await db.commit()
    await db.refresh(assistant_message)
    
    return assistant_message


@router.post("/conversations", response_model=PersonaConversationResponse)
async def create_conversation(
    conversation_data: PersonaConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new persona conversation."""
    # Verify experiment belongs to user
    exp_result = await db.execute(
        select(Experiment).where(
            Experiment.id == conversation_data.experiment_id,
            Experiment.user_id == current_user.id
        )
    )
    experiment = exp_result.scalar_one_or_none()
    
    if not experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found"
        )
    
    # Verify persona exists
    persona_result = await db.execute(
        select(Persona).where(Persona.id == conversation_data.persona_id)
    )
    persona = persona_result.scalar_one_or_none()
    
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona not found"
        )
    
    # Create conversation
    conversation = PersonaConversation(
        experiment_id=conversation_data.experiment_id,
        persona_id=conversation_data.persona_id,
        user_id=current_user.id
    )
    
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    
    return conversation


@router.get("/conversations/{conversation_id}/messages", response_model=List[PersonaMessageResponse])
async def get_conversation_messages(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get messages for a conversation."""
    # Verify conversation belongs to user
    conv_result = await db.execute(
        select(PersonaConversation).where(
            PersonaConversation.id == conversation_id,
            PersonaConversation.user_id == current_user.id
        )
    )
    conversation = conv_result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or unauthorized"
        )
    
    # Get messages
    messages_result = await db.execute(
        select(PersonaMessage).where(
            PersonaMessage.conversation_id == conversation_id
        ).order_by(PersonaMessage.created_at)
    )
    messages = messages_result.scalars().all()
    
    return messages
