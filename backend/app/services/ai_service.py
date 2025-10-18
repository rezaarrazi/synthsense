from typing import Optional, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage
from langchain.memory import ConversationBufferMemory
from app.config import settings


class LLMFactory:
    """Factory class to create LLM instances based on configuration."""
    
    @staticmethod
    def create_llm(
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ):
        """Create LLM instance based on configured provider."""
        model_name = model or settings.MODEL
        
        if settings.LLM_PROVIDER.lower() == "gemini":
            if not settings.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY is required for Gemini provider")
            return ChatGoogleGenerativeAI(
                model=model_name,
                temperature=temperature,
                max_output_tokens=max_tokens,
                google_api_key=settings.GEMINI_API_KEY
            )
        else:  # Default to OpenAI
            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY is required for OpenAI provider")
            return ChatOpenAI(
                model=model_name,
                temperature=temperature,
                max_tokens=max_tokens,
                openai_api_key=settings.OPENAI_API_KEY
            )


def format_persona_profile(persona_data: Dict[str, Any]) -> str:
    """Format persona data into a readable profile string."""
    formatted_lines = []
    
    for key, value in persona_data.items():
        # Format the key to be more readable (convert snake_case to Title Case)
        formatted_key = key.replace("_", " ").title()
        
        # Handle the value
        if value is None:
            formatted_value = "N/A"
        elif isinstance(value, list):
            formatted_value = ", ".join(str(item) for item in value)
        else:
            formatted_value = str(value)
        
        formatted_lines.append(f"{formatted_key}: {formatted_value}")
    
    return "\n".join(formatted_lines)


async def extract_likert_score(response_text: str) -> int:
    """Extract Likert score (1-5) from response text using LLM."""
    llm = LLMFactory.create_llm(temperature=0.1, max_tokens=10)
    
    prompt = f"""You are a Likert Rating Expert. Analyze the consumer statement and assign a purchase intent score from 1-5.

Assign a score from 1-5 based on the consumer's sentiment, using the following intensity guide to ensure distribution across the entire scale:

--- INTENSITY GUIDE ---
- If the statement indicates strong intent, excitement, or a perfect fit: **SCORE 5**
- If the statement indicates a clear functional need, positive intent, and little friction: **SCORE 4**
- If the statement is neutral, highlights major trade-offs, or expresses uncertainty/doubt: **SCORE 3**
- If the statement suggests high friction, major trust issues, or a preference for an alternative: **SCORE 2**
- If the statement expresses immediate dismissal, outright rejection, or irrelevance: **SCORE 1**
---

Consumer statement: {response_text}

Respond with ONLY a single number (1, 2, 3, 4, or 5). No explanation needed."""

    messages = [
        SystemMessage(content="You are a Likert Rating Expert. Respond ONLY with a single number (1, 2, 3, 4, or 5). Do not include any other text."),
        HumanMessage(content=prompt)
    ]
    
    response = await llm.ainvoke(messages)
    
    # Extract number from response
    import re
    score_match = re.search(r'[1-5]', response.content)
    score = int(score_match.group()) if score_match else 3
    
    # Ensure score is within valid range
    return max(1, min(5, score))


class PersonaChatChain:
    """LangChain-based chat service for persona conversations."""
    
    def __init__(self):
        self.llm = LLMFactory.create_llm(temperature=0.7, max_tokens=300)
        self.memory = ConversationBufferMemory(return_messages=True)
    
    async def chat_with_persona(
        self,
        persona_profile: str,
        initial_response: str,
        likert_score: int,
        idea_text: str,
        conversation_history: list,
        user_message: str
    ) -> str:
        """Generate persona response based on context and conversation history."""
        
        system_prompt = f"""You are participating in a consumer research follow-up interview. You must stay in character as the following persona:

{persona_profile}

PRODUCT/IDEA CONTEXT:
"{idea_text}"

YOUR INITIAL REACTION:
You were asked about your purchase intent for this product. You responded: "{initial_response}"
You rated your purchase intent as {likert_score}/5.

INSTRUCTIONS:
- Answer follow-up questions naturally from this persona's perspective
- Stay consistent with your initial reaction and rating
- Consider your demographic background and life circumstances
- Be authentic and conversational, not robotic
- If asked to change your mind, respond realistically based on your persona's values and situation
- Keep responses concise (2-4 sentences unless asked for more detail)"""

        # Build conversation context
        messages = [SystemMessage(content=system_prompt)]
        
        # Add conversation history
        for msg in conversation_history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(SystemMessage(content=msg["content"]))
        
        # Add current user message
        messages.append(HumanMessage(content=user_message))
        
        # Generate response
        response = await self.llm.ainvoke(messages)
        return response.content.strip()
