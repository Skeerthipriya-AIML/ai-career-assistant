from typing import List, Dict, Any, Optional
from bson import ObjectId
from app.repositories.base_repository import BaseRepository

class DocumentRepository(BaseRepository):
    def __init__(self):
        super().__init__("documents")

    async def find_by_id(self, doc_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(doc_id):
            return None
        doc = await self.collection.find_one({
            "_id": ObjectId(doc_id),
            "user_id": user_id
        })
        if doc:
            doc["id"] = str(doc["_id"])
        return doc

    async def list_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id})
        docs = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            docs.append({
                "id": doc["id"],
                "filename": doc["filename"],
                "filepath": doc.get("filepath", ""),
                "fingerprint": doc.get("fingerprint", ""),
                "version": doc.get("version", 1),
                "chunks_count": doc.get("chunks_count", 0),
                "is_favorite": doc.get("is_favorite", False),
                "tags": doc.get("tags", []),
                "summary": doc.get("summary", ""),
                "uploaded_at": doc["uploaded_at"]
            })
        return docs

    async def create(self, doc_data: Dict[str, Any]) -> str:
        result = await self.collection.insert_one(doc_data)
        return str(result.inserted_id)

    async def update_chunks(self, doc_id: str, chunks_count: int) -> None:
        await self.collection.update_one(
            {"_id": ObjectId(doc_id)},
            {"$set": {"chunks_count": chunks_count}}
        )

    async def update_metadata(self, doc_id: str, user_id: str, update_data: Dict[str, Any]) -> bool:
        if not ObjectId.is_valid(doc_id):
            return False
        result = await self.collection.update_one(
            {"_id": ObjectId(doc_id), "user_id": user_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def delete(self, doc_id: str, user_id: str) -> None:
        if not ObjectId.is_valid(doc_id):
            return
        await self.collection.delete_one({
            "_id": ObjectId(doc_id),
            "user_id": user_id
        })

document_repo = DocumentRepository()
