from typing import Dict, Any, List
from datetime import datetime
from app.repositories.base_repository import BaseRepository

class TelemetryRepository(BaseRepository):
    def __init__(self):
        super().__init__("telemetry")

    async def insert_record(self, record: Dict[str, Any]) -> None:
        await self.collection.insert_one(record)

    async def get_counts_and_aggregates(self, mock_stats: Dict[str, Any]) -> Dict[str, Any]:
        db = self.collection.database
        try:
            users_count = await db["users"].count_documents({})
            docs_count = await db["documents"].count_documents({})
            
            # Aggregate stats
            pipeline = [
                {
                    "$group": {
                        "_id": None,
                        "total_tokens": {"$sum": "$tokens_used"},
                        "avg_latency": {"$avg": "$latency_ms"}
                    }
                }
            ]
            
            agg_result = []
            async for doc in self.collection.aggregate(pipeline):
                agg_result.append(doc)
                
            total_tokens = agg_result[0]["total_tokens"] if agg_result else mock_stats["total_tokens_consumed"]
            avg_latency = round(agg_result[0]["avg_latency"], 1) if agg_result else mock_stats["average_latency_ms"]
            
            return {
                "total_users": max(users_count, mock_stats["total_users"]),
                "total_documents": max(docs_count, mock_stats["total_documents"]),
                "total_tokens_consumed": total_tokens,
                "average_latency_ms": avg_latency,
            }
        except Exception as e:
            raise RuntimeError(f"Failed to query database metrics: {e}")

telemetry_repo = TelemetryRepository()
