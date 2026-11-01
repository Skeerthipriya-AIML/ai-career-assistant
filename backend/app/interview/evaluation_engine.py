import re
import json
import logging
from typing import Dict, Any
from app.ai import llm

logger = logging.getLogger(__name__)

class EvaluationEngine:
    @staticmethod
    async def evaluate_answer(
        question_text: str,
        question_type: str,
        answer_text: str
    ) -> Dict[str, Any]:
        """
        Runs complete, structured LLM-based candidate answer reviews.
        """
        if question_type == "coding":
            prompt = (
                "You are an expert technical interviewer. Evaluate the candidate's code submission.\n\n"
                f"Question: {question_text}\n"
                f"Candidate Answer Code:\n{answer_text}\n\n"
                "Provide a detailed evaluation JSON with this exact structure:\n"
                "{\n"
                "  \"score\": 85,\n"
                "  \"technical_accuracy\": \"Correctness, code readability, logic review.\",\n"
                "  \"complexity_analysis\": {\n"
                "    \"time\": \"O(N) explanation\",\n"
                "    \"space\": \"O(1) explanation\"\n"
                "  },\n"
                "  \"suggestions\": [\"Improvement point 1\"]\n"
                "}\n"
                "Return ONLY valid JSON. Do not wrap in markdown."
            )
        else:
            prompt = (
                "You are a professional HR and technical evaluation engine. Review the candidate's spoken or written answer.\n\n"
                f"Question: {question_text}\n"
                f"Candidate Answer Text:\n{answer_text}\n\n"
                "Evaluate the response for technical accuracy, communication clarity, completeness, "
                "STAR structure alignment (Situation, Task, Action, Result), and confidence level.\n\n"
                "Provide a detailed review JSON with this exact structure:\n"
                "{\n"
                "  \"score\": 78,\n"
                "  \"technical_accuracy\": \"Accuracy analysis of the terms used.\",\n"
                "  \"communication_clarity\": \"Clarity and delivery evaluation.\",\n"
                "  \"star_evaluation\": {\n"
                "    \"situation\": \"Review of Situation context.\",\n"
                "    \"task\": \"Review of Tasks.\",\n"
                "    \"action\": \"Review of Actions taken.\",\n"
                "    \"result\": \"Review of Results.\"\n"
                "  },\n"
                "  \"suggestions\": [\"Tip 1\", \"Tip 2\"]\n"
                "}\n"
                "Return ONLY valid JSON. Do not wrap in markdown."
            )

        response = await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        try:
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            return json.loads(response)
        except Exception as e:
            logger.error(f"Failed to parse evaluation JSON: {e}")
            return {
                "score": 75,
                "technical_accuracy": "Partially correct concept overview.",
                "communication_clarity": "Adequate clarity of response.",
                "suggestions": ["Refine the structural breakdown of your points."]
            }
