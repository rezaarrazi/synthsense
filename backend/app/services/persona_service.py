from typing import Dict, Any, List, TypedDict, Optional
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langchain_core.messages import HumanMessage, SystemMessage
from app.services.ai_service import LLMFactory
from app.config import settings
import asyncio
import json
import asyncpg


class PersonaGenerationState(TypedDict):
    """State schema for persona generation workflow."""
    job_id: str
    audience_description: str
    persona_group: str
    personas_generated: int
    total_personas: int
    personas: List[Dict[str, Any]]
    status: str
    error_message: Optional[str]


class PersonaService:
    """LangGraph-based service for generating custom persona cohorts."""
    
    def __init__(self):
        self.llm = LLMFactory.create_llm(temperature=0.8, max_tokens=4000)
    
    def _build_graph(self, checkpointer) -> StateGraph:
        """Build the LangGraph workflow for persona generation."""
        workflow = StateGraph(PersonaGenerationState)
        
        # Add nodes
        workflow.add_node("generate_personas_batch", self._generate_personas_batch)
        workflow.add_node("complete_job", self._complete_job)
        
        # Add edges
        workflow.set_entry_point("generate_personas_batch")
        workflow.add_edge("generate_personas_batch", "complete_job")
        workflow.add_edge("complete_job", END)
        
        return workflow.compile(checkpointer=checkpointer)
    
    async def _generate_personas_batch(self, state: PersonaGenerationState) -> PersonaGenerationState:
        """Generate personas in batches with concurrency control."""
        try:
            batch_size = 10
            total_personas = state["total_personas"]
            concurrent_batches = 5
            all_personas = []
            
            # Calculate number of rounds needed
            total_batches = total_personas // batch_size
            rounds = (total_batches + concurrent_batches - 1) // concurrent_batches
            
            for round_num in range(rounds):
                # Create concurrent generation promises
                generation_promises = []
                batches_in_round = min(concurrent_batches, total_batches - (round_num * concurrent_batches))
                
                for batch_num in range(batches_in_round):
                    actual_batch_num = round_num * concurrent_batches + batch_num + 1
                    promise = self._generate_single_batch(
                        state["audience_description"],
                        batch_size,
                        actual_batch_num
                    )
                    generation_promises.append(promise)
                
                # Wait for all batches in this round to complete
                batch_results = await asyncio.gather(*generation_promises)
                
                # Collect personas from all batches
                for personas in batch_results:
                    all_personas.extend(personas)
                
                # Update progress
                state["personas_generated"] = len(all_personas)
                state["personas"] = all_personas
                
                print(f"Round {round_num + 1}/{rounds}: Generated {len(all_personas)}/{total_personas} personas")
            
            # Trim to exact total if we generated more
            if len(all_personas) > total_personas:
                all_personas = all_personas[:total_personas]
            
            state["personas"] = all_personas
            state["personas_generated"] = len(all_personas)
            state["status"] = "personas_generated"
            
        except Exception as e:
            state["status"] = "error"
            state["error_message"] = str(e)
        
        return state
    
    async def _generate_single_batch(
        self,
        audience_description: str,
        batch_size: int,
        batch_number: int
    ) -> List[Dict[str, Any]]:
        """Generate a single batch of personas."""
        system_prompt = f"""You are an expert at creating realistic, diverse user personas for market research. Generate exactly {batch_size} unique personas based on this audience: "{audience_description}".

MANDATORY FIELDS (must be included for every persona):
- persona_name (string, full name)
- age (number)
- birth_city_country (string, format: "City, Country")
- city_country (string, format: "City, Country")
- education (string, e.g., "High School", "Bachelor's Degree", "PhD")
- income (string, annual income in USD, e.g., "$45,000", "$120,000")
- income_level (string, must be one of: "low", "medium", "high", "very high")
- occupation (string)
- relationship_status (string, e.g., "Single", "Married", "Divorced")
- sex (string, "Male" or "Female" or "Non-binary")

IMPORTANT:
1. Each persona must be UNIQUE - different combinations of demographics
2. Ensure diversity across age, location, income levels, and backgrounds
3. Return ONLY valid JSON array, no markdown formatting
4. Include ONLY the mandatory fields listed above
5. Income level mapping: <$30k = low, $30-80k = medium, $80-150k = high, >$150k = very high

Example format:
[
  {{
    "persona_name": "Alex Chen",
    "age": 28,
    "birth_city_country": "San Francisco, USA",
    "city_country": "Seattle, USA",
    "education": "Bachelor's Degree in Computer Science",
    "income": "$95,000",
    "income_level": "high",
    "occupation": "Software Engineer",
    "relationship_status": "Single",
    "sex": "Male"
  }}
]"""

        user_prompt = f"""Generate {batch_size} unique personas for batch {batch_number}. Make them completely different from previous batches. Return ONLY a valid JSON array with exactly {batch_size} personas, no markdown formatting."""
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        
        response = await self.llm.ainvoke(messages)
        
        # Parse AI response
        try:
            content = response.content.strip()
            
            # Try to extract JSON from markdown code blocks if present
            json_match = content.match(r'```json\s*([\s\S]*?)\s*```') or content.match(r'```\s*([\s\S]*?)\s*```')
            
            if json_match:
                personas = json.loads(json_match.group(1))
            else:
                personas = json.loads(content)
            
            if not isinstance(personas, list):
                raise ValueError("AI did not return an array of personas")
            
            # Validate persona count
            if len(personas) < batch_size * 0.9 or len(personas) > batch_size * 1.1:
                raise ValueError(f"AI generated {len(personas)} personas, expected {batch_size}")
            
            # Trim to exact batch size if needed
            if len(personas) > batch_size:
                personas = personas[:batch_size]
            
            return personas
            
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing AI response for batch {batch_number}: {e}")
            raise ValueError(f"Invalid AI response format: {e}")
    
    def _complete_job(self, state: PersonaGenerationState) -> PersonaGenerationState:
        """Mark the generation job as completed."""
        state["status"] = "completed"
        return state
    
    async def generate_custom_cohort(
        self,
        job_id: str,
        audience_description: str,
        persona_group: str,
        total_personas: int = 100
    ) -> Dict[str, Any]:
        """Generate a custom persona cohort."""
        # Convert SQLAlchemy URL to psycopg URL for AsyncPostgresSaver
        db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        
        # Create connection pool for AsyncPostgresSaver (same as working example)
        from psycopg_pool import AsyncConnectionPool
        pool = AsyncConnectionPool(db_url, kwargs={"autocommit": True, "prepare_threshold": None, })
        
        try:
            async with pool.connection() as conn:
                checkpointer = AsyncPostgresSaver(conn)
                await checkpointer.setup()
                
                # Build graph with checkpointer
                graph = self._build_graph(checkpointer)
                
                # Configure thread for this persona generation job
                config = {
                    "configurable": {
                        "thread_id": job_id
                    }
                }
                
                initial_state = PersonaGenerationState(
                    job_id=job_id,
                    audience_description=audience_description,
                    persona_group=persona_group,
                    personas_generated=0,
                    total_personas=total_personas,
                    personas=[],
                    status="generating",
                    error_message=None
                )
                
                # Run the workflow
                result = await graph.ainvoke(initial_state, config)
                
                return result
        finally:
            await pool.close()
