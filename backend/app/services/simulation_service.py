from typing import Dict, Any, List, TypedDict
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver
from langchain.schema import HumanMessage, SystemMessage
from app.services.ai_service import LLMFactory, format_persona_profile, extract_likert_score
from app.config import settings
import asyncio


class SimulationState(TypedDict):
    """State schema for simulation workflow."""
    experiment_id: str
    personas: List[Dict[str, Any]]
    responses: List[Dict[str, Any]]
    scores: List[int]
    sentiment_breakdown: Dict[str, Any]
    property_distributions: Dict[str, Dict[str, Any]]
    recommendation: str
    status: str
    error_message: Optional[str]


class SimulationService:
    """LangGraph-based simulation service for running consumer research experiments."""
    
    def __init__(self):
        self.llm = LLMFactory.create_llm(temperature=0.7, max_tokens=150)
        self.checkpointer = PostgresSaver.from_conn_string(settings.DATABASE_URL)
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow for simulations."""
        workflow = StateGraph(SimulationState)
        
        # Add nodes
        workflow.add_node("generate_responses", self._generate_responses)
        workflow.add_node("extract_scores", self._extract_scores)
        workflow.add_node("calculate_results", self._calculate_results)
        workflow.add_node("generate_recommendation", self._generate_recommendation)
        
        # Add edges
        workflow.set_entry_point("generate_responses")
        workflow.add_edge("generate_responses", "extract_scores")
        workflow.add_edge("extract_scores", "calculate_results")
        workflow.add_edge("calculate_results", "generate_recommendation")
        workflow.add_edge("generate_recommendation", END)
        
        return workflow.compile(checkpointer=self.checkpointer)
    
    async def _generate_responses(self, state: SimulationState) -> SimulationState:
        """Generate textual responses from personas (Phase 1)."""
        try:
            responses = []
            batch_size = 10  # Process in batches
            
            for i in range(0, len(state["personas"]), batch_size):
                batch = state["personas"][i:i + batch_size]
                batch_promises = []
                
                for persona in batch:
                    persona_profile = format_persona_profile(persona["persona_data"])
                    prompt = f"""You are a participant in a consumer research survey. You must impersonate the provided consumer profile and only respond with a brief, honest textual statement of your purchase intent. Do not use numerical ratings. Do not offer definitions of the Likert scale. Keep your response to 2-4 sentences maximum.

Profile:
{persona_profile}

Marketing Content: {state.get("idea_text", "")}

Question: Based on this information, how likely are you to purchase this product?"""
                    
                    messages = [
                        SystemMessage(content="You are a participant in a consumer research survey."),
                        HumanMessage(content=prompt)
                    ]
                    
                    batch_promises.append(self.llm.ainvoke(messages))
                
                # Process batch concurrently
                batch_responses = await asyncio.gather(*batch_promises)
                
                for persona, response in zip(batch, batch_responses):
                    responses.append({
                        "persona_id": persona["id"],
                        "persona_data": persona["persona_data"],
                        "response_text": response.content.strip()
                    })
            
            state["responses"] = responses
            state["status"] = "responses_generated"
            
        except Exception as e:
            state["status"] = "error"
            state["error_message"] = str(e)
        
        return state
    
    async def _extract_scores(self, state: SimulationState) -> SimulationState:
        """Extract Likert scores from responses (Phase 2)."""
        try:
            scores = []
            
            for response in state["responses"]:
                score = await extract_likert_score(response["response_text"])
                scores.append(score)
            
            state["scores"] = scores
            state["status"] = "scores_extracted"
            
        except Exception as e:
            state["status"] = "error"
            state["error_message"] = str(e)
        
        return state
    
    def _calculate_results(self, state: SimulationState) -> SimulationState:
        """Calculate sentiment breakdown and property distributions."""
        try:
            responses_with_scores = list(zip(state["responses"], state["scores"]))
            
            # Calculate sentiment breakdown
            adopt_count = sum(1 for _, score in responses_with_scores if score >= 4)
            mixed_count = sum(1 for _, score in responses_with_scores if score == 3)
            not_count = sum(1 for _, score in responses_with_scores if score <= 2)
            total = len(responses_with_scores)
            
            state["sentiment_breakdown"] = {
                "adopt": {"count": adopt_count, "percentage": f"{(adopt_count/total)*100:.1f}"},
                "mixed": {"count": mixed_count, "percentage": f"{(mixed_count/total)*100:.1f}"},
                "not": {"count": not_count, "percentage": f"{(not_count/total)*100:.1f}"}
            }
            
            # Calculate property distributions
            state["property_distributions"] = self._calculate_property_distributions(responses_with_scores)
            state["status"] = "results_calculated"
            
        except Exception as e:
            state["status"] = "error"
            state["error_message"] = str(e)
        
        return state
    
    def _calculate_property_distributions(self, responses_with_scores) -> Dict[str, Dict[str, Any]]:
        """Calculate demographic property distributions by sentiment."""
        distributions = {"adopt": {}, "mixed": {}, "not": {}}
        
        allowed_fields = ["age", "income_level", "gender", "relationship_status"]
        
        for response, score in responses_with_scores:
            persona_data = response["persona_data"]
            sentiment = "adopt" if score >= 4 else "mixed" if score == 3 else "not"
            
            for field in allowed_fields:
                if field not in distributions[sentiment]:
                    distributions[sentiment][field] = {}
                
                value = persona_data.get(field, "N/A")
                if isinstance(value, list):
                    value = ", ".join(str(v) for v in value)
                else:
                    value = str(value)
                
                distributions[sentiment][field][value] = distributions[sentiment][field].get(value, 0) + 1
        
        return distributions
    
    async def _generate_recommendation(self, state: SimulationState) -> SimulationState:
        """Generate business recommendation based on results."""
        try:
            sentiment = state["sentiment_breakdown"]
            distributions = state["property_distributions"]
            
            # Build context for recommendation
            breakdown_lines = []
            for key, value in sentiment.items():
                label = key.capitalize()
                breakdown_lines.append(f"- {label}: {value['percentage']}% ({value['count']} responses)")
            
            context = f"""You are a **Senior Business Strategy Consultant**. Your task is to synthesize the provided market research data into a single, highly **actionable growth recommendation**.

Market Sentiment Breakdown:
{chr(10).join(breakdown_lines)}

Segmented Audience Analysis:
Analyze the distributions below to identify **key demographic differences** between the 'Adopted Audience' (Early Adopters) and the 'Not Adopted Audience' (Skeptics).

### Action Mandate (Strictly follow these requirements):
1. **Identify Lead Feature:** Name the best single feature or key selling point to anchor all marketing efforts.
2. **Improvement Plan:** If the overall 'Adopt' percentage is below 50%, propose one concrete feature or positioning improvement.
3. **Targets & Pricing:** Specify a measurable onboarding target and suggest a specific pricing approach to test.
4. **Success Metrics:** List 2-3 specific, instrumentable success metrics.

The final recommendation MUST be a continuous paragraph, strictly between 80 and 140 words."""

            prompt = 'Output MUST be a single JSON object with EXACTLY two keys and types: {"short_title": string, "recommendation": string}. Do NOT include arrays, additional keys, comments, markdown code fences, or any text outside the JSON. short_title is a concise experiment title (max 8 words). recommendation should strictly follow the **Action Mandate** and be kept between 80-140 words.'

            messages = [
                SystemMessage(content=context),
                HumanMessage(content=prompt)
            ]
            
            response = await self.llm.ainvoke(messages)
            
            # Parse JSON response
            import json
            try:
                recommendation_data = json.loads(response.content.strip())
                state["recommendation"] = recommendation_data.get("recommendation", "No recommendation available")
            except json.JSONDecodeError:
                state["recommendation"] = response.content.strip()
            
            state["status"] = "completed"
            
        except Exception as e:
            state["status"] = "error"
            state["error_message"] = str(e)
        
        return state
    
    async def run_simulation(
        self,
        experiment_id: str,
        personas: List[Dict[str, Any]],
        idea_text: str
    ) -> Dict[str, Any]:
        """Run a complete simulation workflow."""
        initial_state = SimulationState(
            experiment_id=experiment_id,
            personas=personas,
            responses=[],
            scores=[],
            sentiment_breakdown={},
            property_distributions={},
            recommendation="",
            status="starting",
            error_message=None
        )
        
        # Add idea_text to state for use in nodes
        initial_state["idea_text"] = idea_text
        
        # Run the workflow
        result = await self.graph.ainvoke(initial_state)
        
        return result
