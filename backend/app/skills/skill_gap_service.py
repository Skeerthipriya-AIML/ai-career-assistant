import logging
from typing import Dict, Any, List
from app.skills.skill_extractor import SkillExtractor

logger = logging.getLogger(__name__)

class SkillGapService:
    ROLE_PROFILES = {
        "full stack": ["React", "Node.js", "JavaScript", "TypeScript", "MongoDB", "REST APIs", "HTML5", "CSS3", "Git", "Docker"],
        "frontend": ["React", "TypeScript", "JavaScript", "HTML5", "CSS3", "Tailwind CSS", "Redux", "Git", "Next.js"],
        "backend": ["Python", "FastAPI", "Node.js", "PostgreSQL", "MongoDB", "Docker", "REST APIs", "System Design", "Git"],
        "ai": ["Python", "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Pandas", "NumPy", "Scikit-Learn", "Git"],
        "machine learning": ["Python", "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Pandas", "NumPy", "Scikit-Learn", "Git"],
        "data science": ["Python", "SQL", "Pandas", "NumPy", "Scikit-Learn", "Machine Learning", "Data Visualization", "Git"],
        "cloud": ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Terraform", "Git", "Python"]
    }

    @classmethod
    async def analyze_gap(cls, resume_text: str, job_description_text: str) -> Dict[str, Any]:
        """
        Extracts skills from both resume and JD, then calculates matched and missing skills.
        """
        resume_skills = await SkillExtractor.extract_skills(resume_text)
        jd_skills = await SkillExtractor.extract_skills(job_description_text)
        
        resume_tech = list(dict.fromkeys(resume_skills.get("technical_skills", [])))
        jd_tech = list(dict.fromkeys(jd_skills.get("technical_skills", [])))
        
        # If JD text was short or a role name, enrich expected skills
        jd_lower = (job_description_text or "").lower()
        for role_key, role_skills in cls.ROLE_PROFILES.items():
            if role_key in jd_lower:
                for s in role_skills:
                    if s not in jd_tech:
                        jd_tech.append(s)

        if not jd_tech:
            jd_tech = ["Python", "React", "SQL", "Git", "REST APIs", "Data Structures", "Docker"]
            
        resume_tech_set = set(s.lower().replace(".js", "").replace(" ", "") for s in resume_tech)
        
        matched_tech = []
        missing_tech = []
        
        for skill in jd_tech:
            normalized = skill.lower().replace(".js", "").replace(" ", "")
            if normalized in resume_tech_set or any(normalized in r for r in resume_tech_set):
                matched_tech.append(skill)
            else:
                missing_tech.append(skill)
                
        match_score = 75.0
        if jd_tech:
            match_score = (len(matched_tech) / len(jd_tech)) * 100.0
            
        return {
            "matched_skills": matched_tech,
            "missing_skills": missing_tech,
            "match_percentage": round(min(max(match_score, 25.0), 98.0), 1),
            "resume_soft_skills": resume_skills.get("soft_skills", []),
            "jd_soft_skills": jd_skills.get("soft_skills", [])
        }
