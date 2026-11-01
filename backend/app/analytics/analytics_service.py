from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.repositories.telemetry_repo import telemetry_repo

class AnalyticsService:
    @staticmethod
    async def get_user_analytics(user_id: str) -> Dict[str, Any]:
        """
        Aggregates MongoDB data to track daily uploads, chats, token usage,
        and tool hits for a specific user over the last 7 days.
        """
        db = telemetry_repo.collection.database
        now = datetime.utcnow()
        start_date = now - timedelta(days=7)
        
        # 1. Uploads per day (last 7 days)
        uploads_pipeline = [
            {"$match": {"user_id": user_id, "uploaded_at": {"$gte": start_date}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$uploaded_at"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        uploads_data = []
        async for doc in db["documents"].aggregate(uploads_pipeline):
            uploads_data.append(doc)
            
        # 2. Chats per day (last 7 days)
        chats_pipeline = [
            {"$match": {"user_id": user_id, "created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        chats_data = []
        async for doc in db["chats"].aggregate(chats_pipeline):
            chats_data.append(doc)

        # 3. Tokens per day (last 7 days)
        tokens_pipeline = [
            {"$match": {"user_id": user_id, "timestamp": {"$gte": start_date}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                "tokens": {"$sum": "$tokens_used"}
            }},
            {"$sort": {"_id": 1}}
        ]
        tokens_data = []
        async for doc in db["telemetry"].aggregate(tokens_pipeline):
            tokens_data.append(doc)

        # 4. Interview history summary
        interviews_cursor = db["interviews"].find({"user_id": user_id}).sort("created_at", -1).limit(5)
        interview_history = []
        async for i in interviews_cursor:
            interview_history.append({
                "id": str(i["_id"]),
                "type": i.get("type", "General"),
                "average_score": i.get("average_score", 0),
                "created_at": i["created_at"],
                "questions_count": len(i.get("exchanges", []))
            })

        # 5. Most used tools (by endpoint hits in telemetry)
        tools_pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": "$endpoint",
                "hits": {"$sum": 1}
            }},
            {"$sort": {"hits": -1}}
        ]
        most_used_tools = []
        async for doc in db["telemetry"].aggregate(tools_pipeline):
            endpoint = doc["_id"]
            name = endpoint
            if "/chatbot" in endpoint:
                name = "Knowledge Search"
            elif "/coach" in endpoint:
                name = "Interview Coach"
            elif "/agent" in endpoint:
                name = "AI ReAct Agent"
            most_used_tools.append({"name": name, "hits": doc.get("hits", 0)})

        # 6. Document types distribution
        docs_cursor = db["documents"].find({"user_id": user_id})
        doc_types = {"PDF": 0, "Word": 0, "Excel/CSV": 0, "PPT": 0, "Images": 0, "Other": 0}
        async for doc in docs_cursor:
            filename = doc.get("filename", "").lower()
            if filename.endswith(".pdf"):
                doc_types["PDF"] += 1
            elif filename.endswith((".docx", ".doc")):
                doc_types["Word"] += 1
            elif filename.endswith((".xlsx", ".xls", ".csv")):
                doc_types["Excel/CSV"] += 1
            elif filename.endswith(".pptx"):
                doc_types["PPT"] += 1
            elif filename.endswith((".png", ".jpg", ".jpeg", ".webp")):
                doc_types["Images"] += 1
            else:
                doc_types["Other"] += 1

        file_distribution = [{"name": k, "value": v} for k, v in doc_types.items() if v > 0]
        
        # Build 7-day weekly timeline
        weekly_usage = []
        for i in range(7):
            d_date = now - timedelta(days=6-i)
            d = d_date.strftime("%Y-%m-%d")
            label_short = d_date.strftime("%a") # e.g. "Mon"
            
            up_val = next((item["count"] for item in uploads_data if item["_id"] == d), 0)
            ch_val = next((item["count"] for item in chats_data if item["_id"] == d), 0)
            tk_val = next((item["tokens"] for item in tokens_data if item["_id"] == d), 0)
            
            weekly_usage.append({
                "day": label_short,
                "date": d,
                "uploads": up_val,
                "chats": ch_val,
                "tokens": tk_val
            })

        return {
            "uploads_per_day": uploads_data,
            "chats_per_day": chats_data,
            "tokens_per_day": tokens_data,
            "interview_history": interview_history,
            "most_used_tools": most_used_tools,
            "file_distribution": file_distribution,
            "weekly_usage": weekly_usage
        }
