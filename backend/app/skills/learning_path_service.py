import logging
from typing import Dict, Any, List
from app.ai import llm

logger = logging.getLogger(__name__)

class LearningPathService:
    @staticmethod
    async def generate_roadmap(missing_skills: List[str], target_role: str) -> str:
        """
        Generates a detailed, step-by-step learning roadmap in Markdown format.
        """
        if not missing_skills:
            return "No missing skills identified. Ready to proceed to mock interviews!"

        skills_str = ", ".join(missing_skills)
        prompt = (
            f"Generate an actionable learning path and study roadmap for a candidate aiming to become a '{target_role}'.\n"
            f"They are missing these specific skills: {skills_str}.\n\n"
            "Provide the roadmap in clean Markdown, structuring it into:\n"
            "1. **Core Learning Milestones**: Time-bounded study stages (e.g. Week 1-2, Week 3-4).\n"
            "2. **Recommended Courses & Tutorial Keywords**: Specific topics or certifications to search on platforms (Coursera, Udemy, etc.).\n"
            "3. **Practical Portfolio Projects**: 2 hands-on coding project ideas demonstrating these missing skills.\n"
            "4. **Mock Interview Preparation Milestones**: How to prepare for questions on these topics."
        )
        
        return await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4
        )
