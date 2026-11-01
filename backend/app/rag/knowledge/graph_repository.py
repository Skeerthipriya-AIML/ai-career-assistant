from datetime import datetime
from typing import List, Dict, Any
from app.repositories.base_repository import BaseRepository

class GraphRepository(BaseRepository):
    def __init__(self):
        super().__init__("knowledge_graph")

    async def save_relationships(self, relations: List[Dict[str, Any]]) -> int:
        if not relations:
            return 0
        res = await self.collection.insert_many(relations)
        return len(res.inserted_ids)

    async def find_relationships_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id})
        rels = []
        async for r in cursor:
            rels.append({
                "subject": r["subject"],
                "predicate": r["predicate"],
                "object": r["object"],
                "document_id": str(r["document_id"])
            })
        return rels

    async def delete_by_document(self, document_id: str) -> int:
        res = await self.collection.delete_many({"document_id": document_id})
        return res.deleted_count

graph_repo = GraphRepository()
