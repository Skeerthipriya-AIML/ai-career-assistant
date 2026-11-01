import logging
from typing import List, Dict, Any
from app.rag.knowledge.graph_repository import graph_repo
from app.rag.knowledge.entity_extractor import EntityExtractor
from app.rag.knowledge.relation_extractor import RelationExtractor

logger = logging.getLogger(__name__)

class GraphService:
    @staticmethod
    async def extract_and_index_relations(user_id: str, document_id: str, text: str) -> int:
        """
        Coordinates entity extraction and relation extraction to build the knowledge graph in MongoDB.
        """
        try:
            entities = EntityExtractor.extract_entities(text)
            if not entities:
                return 0
            relations = RelationExtractor.extract_relations(user_id, document_id, entities)
            if not relations:
                return 0
            return await graph_repo.save_relationships(relations)
        except Exception as e:
            logger.error(f"Failed to index relationships: {e}")
            return 0

    @staticmethod
    async def get_relationships(user_id: str) -> List[Dict[str, Any]]:
        return await graph_repo.find_relationships_by_user(user_id)

    @staticmethod
    async def delete_by_document(document_id: str) -> int:
        return await graph_repo.delete_by_document(document_id)
