import logging
from typing import List, Dict, Any
from app.ai import llm

logger = logging.getLogger(__name__)

class ImprovementPlanner:
    @staticmethod
    async def generate_plan(
        weaknesses: List[str],
        role: str = "Software Engineer"
    ) -> str:
        """
        Generates an actionable mock interview improvement plan.
        """
        if not weaknesses:
            return "No severe weaknesses noted. Suggest proceeding with advanced mixed focus sessions."
            
        weakness_str = ", ".join(weaknesses)
        prompt = (
            f"You are an Interview Mentor. A candidate seeking the role of '{role}' has these weaknesses:\n"
            f"{weakness_str}\n\n"
            "Generate a custom mock interview improvement planner in Markdown containing:\n"
            "1. **Core Practice Focus Area**: Technical definitions or behavioral situations to review.\n"
            "2. **Specific STAR Scenarios to practice**: E.g. 'Describe how you resolved a team conflict'.\n"
            "3. **Recommended Study Topics**: Specific libraries, algorithms, or systems concepts to review.\n"
            "4. **Suggested Next Interview Session**: E.g. Google-focused technical interview, Amazon behavior focus, etc."
        )
        return await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4
        )
