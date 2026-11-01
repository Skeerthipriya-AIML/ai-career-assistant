import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from app.agents.execution_repository import execution_repo

logger = logging.getLogger(__name__)

class ExecutionService:
    @staticmethod
    async def start_execution(user_id: str, prompt: str) -> str:
        initial_record = {
            "status": "STARTED",
            "start_time": datetime.utcnow(),
            "end_time": None,
            "tools_used": [],
            "steps": [],
            "metrics": {
                "planner_latency_ms": 0.0,
                "tool_latency_ms": 0.0,
                "reflection_latency_ms": 0.0,
                "total_latency_ms": 0.0,
                "tool_calls_count": 0,
                "retry_count": 0
            }
        }
        return await execution_repo.create_execution(user_id, prompt, initial_record)

    @staticmethod
    async def update_execution_metrics(
        execution_id: str,
        user_id: str,
        status: str,
        steps: List[Dict[str, Any]],
        tools_used: List[str],
        metrics: Dict[str, Any]
    ) -> bool:
        update_fields = {
            "end_time": datetime.utcnow(),
            "steps": steps,
            "tools_used": tools_used,
            "metrics": metrics
        }
        return await execution_repo.update_status(execution_id, user_id, status, update_fields)

    @staticmethod
    async def cancel_execution(execution_id: str, user_id: str) -> bool:
        update_fields = {
            "end_time": datetime.utcnow()
        }
        return await execution_repo.update_status(execution_id, user_id, "CANCELLED", update_fields)

    @staticmethod
    async def get_execution_record(execution_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        return await execution_repo.get_execution(execution_id, user_id)
