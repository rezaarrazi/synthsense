from typing import Dict, Any, List, Optional
from langchain_core.messages import HumanMessage, SystemMessage
from app.services.ai_service import LLMFactory, format_persona_profile, extract_likert_score
from app.config import settings
import asyncio
import json


class SimulationService:
    """Simulation service for running consumer research experiments with parallel batch processing."""
    
    def __init__(self):
        self.llm = LLMFactory.create_llm(temperature=0.7, max_tokens=150)
        self.batch_size = 10  # Process personas in batches for better performance
    
    async def _call_llm_phase1(self, persona_profile: str, idea_text: str) -> str:
        """Phase 1: Generate textual response from persona."""
        prompt = f"""You are a participant in a consumer research survey. You must impersonate the provided consumer profile and only respond with a brief, honest textual statement of your purchase intent. Do not use numerical ratings. Do not offer definitions of the Likert scale. Keep your response to 2-4 sentences maximum.

Profile:
{persona_profile}

Marketing Content: {idea_text}

Question: Based on this information, how likely are you to purchase this product?"""
        
        messages = [
            SystemMessage(content="You are a participant in a consumer research survey."),
            HumanMessage(content=prompt)
        ]
        
        response = await self.llm.ainvoke(messages)
        return response.content.strip()
    
    async def _call_llm_phase2(self, text_response: str) -> int:
        """Phase 2: Extract Likert score from response."""
        prompt = f"""You are a Likert Rating Expert. Analyze the consumer statement and assign a purchase intent score from 1-5.

Assign a score from 1-5 based on the consumer's sentiment, using the following intensity guide to ensure distribution across the entire scale:

--- INTENSITY GUIDE ---
- If the statement indicates strong intent, excitement, or a perfect fit: **SCORE 5**
- If the statement indicates a clear functional need, positive intent, and little friction: **SCORE 4**
- If the statement is neutral, highlights major trade-offs, or expresses uncertainty/doubt: **SCORE 3**
- If the statement suggests high friction, major trust issues, or a preference for an alternative: **SCORE 2**
- If the statement expresses immediate dismissal, outright rejection, or irrelevance: **SCORE 1**
---

Consumer statement: {text_response}

Respond with ONLY a single number (1, 2, 3, 4, or 5). No explanation needed."""
        
        messages = [
            SystemMessage(content="You are a Likert Rating Expert. Respond ONLY with a single number (1, 2, 3, 4, or 5). Do not include any other text."),
            HumanMessage(content=prompt)
        ]
        
        response = await self.llm.ainvoke(messages)
        
        # Robust parsing: search for the first digit between 1 and 5
        import re
        score_match = re.search(r'[1-5]', response.content)
        score = int(score_match.group()) if score_match else 3
        
        # Final clamp to ensure score is valid
        return max(1, min(5, score))
    
    async def _process_persona_complete(self, persona: Dict[str, Any], persona_profile: str, idea_text: str) -> Dict[str, Any]:
        """Process a single persona through both Phase 1 and Phase 2."""
        try:
            # Phase 1: Generate textual response
            text_response = await self._call_llm_phase1(persona_profile, idea_text)
            
            # Phase 2: Extract Likert score
            score = await self._call_llm_phase2(text_response)
            
            return {
                "persona_id": persona["id"],
                "persona_data": persona["persona_data"],
                "response_text": text_response,
                "score": score
            }
        except Exception as e:
            # Return a default result if processing fails
            return {
                "persona_id": persona["id"],
                "persona_data": persona["persona_data"],
                "response_text": "Error processing persona",
                "score": 3  # Default neutral score
            }
    
    def _calculate_sentiment_breakdown(self, results: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Calculate sentiment breakdown from results."""
        adopt_count = sum(1 for result in results if result["score"] >= 4)
        mixed_count = sum(1 for result in results if result["score"] == 3)
        not_count = sum(1 for result in results if result["score"] <= 2)
        total = len(results)
        
        if total == 0:
            return {
                "adopt": {"count": 0, "percentage": "0.0"},
                "mixed": {"count": 0, "percentage": "0.0"},
                "not": {"count": 0, "percentage": "0.0"}
            }
        
        return {
            "adopt": {"count": adopt_count, "percentage": f"{(adopt_count/total)*100:.1f}"},
            "mixed": {"count": mixed_count, "percentage": f"{(mixed_count/total)*100:.1f}"},
            "not": {"count": not_count, "percentage": f"{(not_count/total)*100:.1f}"}
        }
    
    def _calculate_property_distributions(self, results: List[Dict[str, Any]]) -> Dict[str, Dict[str, Dict[str, int]]]:
        """Calculate demographic property distributions by sentiment."""
        distributions = {"adopt": {}, "mixed": {}, "not": {}}
        
        allowed_fields = ["age", "income_level", "gender", "relationship_status"]
        
        for result in results:
            persona_data = result["persona_data"]
            score = result["score"]
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
    
    async def _generate_recommendation(self, idea_text: str, sentiment_breakdown: Dict[str, Any], 
                                    property_distributions: Dict[str, Dict[str, Dict[str, int]]]) -> str:
        """Generate business recommendation based on results."""
        # Build context for recommendation
        breakdown_lines = []
        for key, value in sentiment_breakdown.items():
            label = key.capitalize()
            breakdown_lines.append(f"- {label}: {value['percentage']}% ({value['count']} responses)")
        
        context = f"""You are a **Senior Business Strategy Consultant**. Your task is to synthesize the provided market research data into a single, highly **actionable growth recommendation**.

Product Idea:
\"\"\"
{idea_text}
\"\"\"

Market Sentiment Breakdown:
{chr(10).join(breakdown_lines)}

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
        try:
            recommendation_data = json.loads(response.content.strip())
            return {
                "title": recommendation_data.get("short_title", "Experiment"),
                "recommendation": recommendation_data.get("recommendation", "No recommendation available")
            }
        except json.JSONDecodeError:
            return {
                "title": "Experiment",
                "recommendation": response.content.strip()
            }
    
    async def run_simulation(
        self,
        experiment_id: str,
        personas: List[Dict[str, Any]],
        idea_text: str
    ) -> Dict[str, Any]:
        """Run a complete simulation workflow with parallel batch processing."""
        try:
            total_personas = len(personas)
            all_results = []
            
            print(f"Processing {total_personas} personas in batches of {self.batch_size}")
            
            # Process personas in batches
            for i in range(0, total_personas, self.batch_size):
                batch = personas[i:i + self.batch_size]
                batch_num = (i // self.batch_size) + 1
                total_batches = (total_personas + self.batch_size - 1) // self.batch_size
                
                print(f"Processing batch {batch_num}/{total_batches}")
                
                # Process each persona through both phases in parallel
                batch_promises = []
                for persona in batch:
                    persona_profile = format_persona_profile(persona["persona_data"])
                    # Create a coroutine that runs both phases for this persona
                    batch_promises.append(self._process_persona_complete(persona, persona_profile, idea_text))
                
                # Process batch concurrently - each persona completes both phases
                batch_results = await asyncio.gather(*batch_promises)
                
                # Add results to overall results
                all_results.extend(batch_results)
                
                print(f"Batch {batch_num} complete. Total processed: {len(all_results)}/{total_personas}")
            
            # Calculate aggregate statistics
            sentiment_breakdown = self._calculate_sentiment_breakdown(all_results)
            property_distributions = self._calculate_property_distributions(all_results)
            
            # Generate recommendation
            recommendation_data = await self._generate_recommendation(
                idea_text, 
                sentiment_breakdown, 
                property_distributions
            )
            
            # Prepare response data
            responses = [
                {
                    "persona_id": result["persona_id"],
                    "persona_data": result["persona_data"],
                    "response_text": result["response_text"]
                }
                for result in all_results
            ]
            
            scores = [result["score"] for result in all_results]
            
            return {
                "experiment_id": experiment_id,
                "personas": personas,
                "responses": responses,
                "scores": scores,
                "sentiment_breakdown": sentiment_breakdown,
                "property_distributions": property_distributions,
                "title": recommendation_data["title"],
                "recommendation": recommendation_data["recommendation"],
                "status": "completed",
                "error_message": None
            }
            
        except Exception as e:
            return {
                "experiment_id": experiment_id,
                "personas": personas,
                "responses": [],
                "scores": [],
                "sentiment_breakdown": {},
                "property_distributions": {},
                "title": "Experiment",
                "recommendation": "",
                "status": "error",
                "error_message": str(e)
            }
