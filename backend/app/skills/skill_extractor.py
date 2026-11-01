import re
import json
import logging
from typing import Dict, Any, List
from app.ai import llm

logger = logging.getLogger(__name__)

class SkillExtractor:
    # Comprehensive tech taxonomy for robust extraction
    TAXONOMY_TECH = [
        "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "C", "Go", "Rust", "PHP", "Ruby", "Kotlin", "Swift",
        "React", "React.js", "Redux", "Next.js", "Vue.js", "Angular", "Tailwind CSS", "HTML", "HTML5", "CSS", "CSS3", "Bootstrap",
        "Node.js", "Express.js", "FastAPI", "Django", "Flask", "Spring Boot", "REST APIs", "GraphQL", "Microservices", "WebSockets",
        "MongoDB", "PostgreSQL", "MySQL", "SQLite", "Redis", "ChromaDB", "Pinecone", "Vector Databases", "DynamoDB", "SQL",
        "Machine Learning", "Deep Learning", "Generative AI", "LLMs", "NLP", "Computer Vision", "PyTorch", "TensorFlow",
        "Scikit-Learn", "Pandas", "NumPy", "LangChain", "RAG", "Transformers", "Hugging Face", "OpenCV",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Git", "GitHub", "Linux", "Terraform", "Nginx",
        "Data Structures", "Algorithms", "System Design", "OOP", "DBMS", "Computer Networks", "Operating Systems"
    ]

    TAXONOMY_SOFT = [
        "Problem Solving", "Team Collaboration", "Leadership", "Communication", "Critical Thinking",
        "Agile Methodologies", "Scrum", "Analytical Thinking", "Time Management", "Adaptability"
    ]

    @classmethod
    def _extract_taxonomy_skills(cls, text: str) -> Dict[str, List[str]]:
        text_clean = text or ""
        matched_tech = []
        for skill in cls.TAXONOMY_TECH:
            pattern = r"\b" + re.escape(skill) + r"\b"
            if re.search(pattern, text_clean, re.IGNORECASE):
                # Normalize skill name
                matched_tech.append(skill)

        # Catch AIML / FSD / Full Stack aliases
        if re.search(r"\b(?:aiml|ai/ml|ai\s*&\s*ml)\b", text_clean, re.IGNORECASE):
            if "Machine Learning" not in matched_tech:
                matched_tech.extend(["Machine Learning", "Generative AI"])
        if re.search(r"\b(?:fsd|full\s*stack)\b", text_clean, re.IGNORECASE):
            for fs_skill in ["React", "Node.js", "JavaScript", "REST APIs", "MongoDB"]:
                if fs_skill not in matched_tech:
                    matched_tech.append(fs_skill)

        matched_soft = []
        for soft in cls.TAXONOMY_SOFT:
            pattern = r"\b" + re.escape(soft) + r"\b"
            if re.search(pattern, text_clean, re.IGNORECASE):
                matched_soft.append(soft)

        return {
            "technical_skills": list(dict.fromkeys(matched_tech)),
            "soft_skills": list(dict.fromkeys(matched_soft)) or ["Problem Solving", "Team Collaboration", "Communication"]
        }

    @classmethod
    async def extract_skills(cls, text: str) -> Dict[str, List[str]]:
        """
        Parses text content to identify core technical frameworks, languages, databases, 
        and soft skills using hybrid LLM + domain taxonomy matcher.
        """
        taxonomy_results = cls._extract_taxonomy_skills(text)

        prompt = (
            "Analyze the following text (e.g. resume or job description) and extract the technical skills "
            "(languages, frameworks, databases, libraries, clouds, devops tools) and soft skills.\n\n"
            "Return the output as a valid JSON object containing these fields:\n"
            "{\n"
            "  \"technical_skills\": [\"Python\", \"FastAPI\", \"React\"],\n"
            "  \"soft_skills\": [\"Leadership\", \"System Design\", \"Communication\"]\n"
            "}\n"
            "Return ONLY the raw JSON object. Do not wrap in markdown or prefix text.\n\n"
            f"Target Text Content:\n{text[:4000]}"
        )
        try:
            response = await llm.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2
            )
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                llm_tech = parsed.get("technical_skills", [])
                llm_soft = parsed.get("soft_skills", [])
                
                # Merge taxonomy and LLM
                combined_tech = list(dict.fromkeys(taxonomy_results["technical_skills"] + llm_tech))
                combined_soft = list(dict.fromkeys(taxonomy_results["soft_skills"] + llm_soft))
                return {
                    "technical_skills": combined_tech,
                    "soft_skills": combined_soft
                }
        except Exception as e:
            logger.error(f"Skill extraction exception handled with taxonomy fallback: {e}")

        return taxonomy_results
