import logging
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class RelationExtractor:
    @staticmethod
    def extract_relations(
        user_id: str,
        document_id: str,
        entities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Takes extracted entities and builds relationship edges.
        """
        relations = []
        for ent in entities:
            predicate = "hasSkill"
            if ent["type"] == "DATABASE":
                predicate = "usesDatabase"
                
            relations.append({
                "user_id": user_id,
                "document_id": document_id,
                "subject": "User",
                "predicate": predicate,
                "object": ent["value"],
                "created_at": datetime.utcnow()
            })
            
        return relations
