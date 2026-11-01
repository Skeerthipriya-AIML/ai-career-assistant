import logging
from typing import List, Dict, Any, Tuple, Optional
from app.ai import llm

# Import modular services
from app.interview.question_generator import QuestionGenerator
from app.interview.session_manager import SessionManager
from app.interview.evaluation_engine import EvaluationEngine
from app.interview.feedback_engine import FeedbackEngine
from app.interview.scoring_service import ScoringService
from app.interview.improvement_planner import ImprovementPlanner

from app.skills.skill_gap_service import SkillGapService
from app.skills.learning_path_service import LearningPathService
from app.skills.career_match_service import CareerMatchService

logger = logging.getLogger(__name__)

class CoachService:
    @staticmethod
    async def generate_interview_question(question_type: str, company: str = "General") -> Dict[str, Any]:
        """
        Generates a contextual interview question.
        """
        return await QuestionGenerator.generate_question(
            question_type=question_type,
            company=company
        )

    @staticmethod
    async def evaluate_answer(
        question_text: str,
        question_type: str,
        answer_text: str
    ) -> Dict[str, Any]:
        """
        Evaluates the user's answer, returning score, accuracy, STAR, and strengths/weaknesses.
        """
        eval_res = await EvaluationEngine.evaluate_answer(
            question_text=question_text,
            question_type=question_type,
            answer_text=answer_text
        )
        
        # Generate strengths & weaknesses
        fb_res = await FeedbackEngine.generate_feedback(eval_res)
        
        # Generate improvement roadmap plan based on weaknesses
        plan_res = await ImprovementPlanner.generate_plan(fb_res.get("weaknesses", []), question_type)
        
        return {
            **eval_res,
            "strengths": fb_res.get("strengths", []),
            "weaknesses": fb_res.get("weaknesses", []),
            "improvement_plan": plan_res
        }

    @staticmethod
    async def analyze_resume_ats(resume_text: str, job_description: str) -> Dict[str, Any]:
        """
        Parses resume text and rates it against target JD using the Skills Intelligence package.
        """
        gap_report = await SkillGapService.analyze_gap(resume_text, job_description)
        
        # Generate learning roadmap using missing skills
        roadmap = await LearningPathService.generate_roadmap(
            missing_skills=gap_report.get("missing_skills", []),
            target_role="Software Engineer"
        )
        
        # Determine career fit score
        fit_report = await CareerMatchService.evaluate_fit(
            skills=gap_report.get("matched_skills", []),
            target_role="Software Engineer"
        )
        
        # Format compatibility payload
        return {
            "overall_score": fit_report.get("fit_score", gap_report.get("match_percentage", 75)),
            "matched_skills": gap_report.get("matched_skills", []),
            "missing_skills": gap_report.get("missing_skills", []),
            "formatting_score": 85,
            "feedback": fit_report.get("career_advice", "Resume matches core technical criteria."),
            "suggestions": fit_report.get("suggested_next_steps", []) + [f"Follow the learning roadmap: {roadmap[:80]}..."],
            "learning_roadmap": roadmap
        }

class SpeechService:
    @staticmethod
    async def base64_audio_to_text(audio_base64: str) -> str:
        """
        Decodes audio payload and invokes Whisper model transcription.
        """
        return await llm.transcribe_audio(audio_base64)
