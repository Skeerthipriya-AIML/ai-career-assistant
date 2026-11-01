import logging
from typing import Dict, Any, List
from app.ai import llm

logger = logging.getLogger(__name__)

class CareerMatchService:
    @staticmethod
    async def evaluate_fit(skills: List[str], target_role: str) -> Dict[str, Any]:
        """
        Calculates compatibility score and generates expert guidance.
        """
        skills_str = ", ".join(skills)
        prompt = (
            f"You are a Senior Career Coach. A candidate is applying for the role: '{target_role}'.\n"
            f"They possess the following skills: {skills_str}.\n\n"
            "Evaluate their alignment and return the output as a valid JSON object containing these exact fields:\n"
            "{\n"
            "  \"fit_score\": 82,\n"
            "  \"career_advice\": \"General advice on role fit.\",\n"
            "  \"suggested_next_steps\": [\"Step A\", \"Step B\"]\n"
            "}\n"
            "Return ONLY the raw JSON object. Do not wrap in markdown."
        )
        response = await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        try:
            import re
            import json
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            return json.loads(response)
        except Exception as e:
            logger.error(f"Failed to parse career match JSON: {e}")
            return {
                "fit_score": 70,
                "career_advice": "Their skills are partially aligned with this target career role.",
                "suggested_next_steps": ["Strengthen knowledge of core technologies."]
            }
