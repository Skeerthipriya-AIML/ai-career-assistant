import logging
from typing import Dict, Any, List
from app.ai import llm

logger = logging.getLogger(__name__)

class FeedbackEngine:
    @staticmethod
    async def generate_feedback(evaluation: Dict[str, Any]) -> Dict[str, Any]:
        """
        Summarizes evaluation metrics to extract concrete strengths and weaknesses.
        """
        score = evaluation.get("score", 70)
        tech_acc = evaluation.get("technical_accuracy", "N/A")
        comm_clarity = evaluation.get("communication_clarity", "N/A")
        
        prompt = (
            "Based on the following candidate evaluation metrics, summarize their performance.\n"
            f"- Score: {score}/100\n"
            f"- Technical Accuracy: {tech_acc}\n"
            f"- Communication Clarity: {comm_clarity}\n\n"
            "Return a valid JSON object containing these exact fields:\n"
            "{\n"
            "  \"strengths\": [\"Strength 1\", \"Strength 2\"],\n"
            "  \"weaknesses\": [\"Weakness 1\", \"Weakness 2\"]\n"
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
            logger.error(f"Failed to parse feedback JSON: {e}")
            return {
                "strengths": ["Structured delivery of key milestones."],
                "weaknesses": ["Needs to detail technical specifications further."]
            }
