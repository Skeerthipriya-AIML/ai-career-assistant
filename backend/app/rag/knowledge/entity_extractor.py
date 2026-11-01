import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class EntityExtractor:
    @staticmethod
    def extract_entities(text: str) -> List[Dict[str, Any]]:
        """
        Parses text to extract recognizable technical entities.
        Returns a list of dicts with entity type and value.
        """
        entities = []
        text_lower = text.lower()
        
        patterns = {
            "SKILL": [
                (r"\bpython\b", "Python"),
                (r"\bfastapi\b", "FastAPI"),
                (r"\breact(?:\.js)?\b", "React"),
                (r"\btypescript\b", "TypeScript"),
                (r"\bdocker\b", "Docker"),
                (r"\bkubernetes\b", "Kubernetes"),
                (r"\baws\b", "AWS"),
                (r"\blangchain\b", "LangChain"),
                (r"\bvite\b", "Vite"),
                (r"\bmachine learning\b", "Machine Learning")
            ],
            "DATABASE": [
                (r"\bmongodb\b", "MongoDB"),
                (r"\bchromadb\b", "ChromaDB"),
                (r"\bpostgres(?:gresql)?\b", "PostgreSQL"),
                (r"\bredis\b", "Redis")
            ]
        }
        
        for ent_type, label_list in patterns.items():
            for regex, val in label_list:
                if re.search(regex, text_lower):
                    entities.append({
                        "value": val,
                        "type": ent_type
                    })
                    
        return entities
