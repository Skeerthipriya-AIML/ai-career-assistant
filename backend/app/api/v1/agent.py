import time
import json
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Form
from fastapi.responses import StreamingResponse
from app.core.security import get_current_user
from app.agents.agent_service import AgentService
from app.agents.execution_service import ExecutionService
from app.services.admin_service import AdminService
from app.notifications.notification_service import NotificationService

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/execute")
async def execute_agent_loop(
    prompt: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Decoupled streaming endpoint executing the LangGraph agent graph, 
    persisting results, and yielding structured JSON Line status events.
    """
    logger.info(f"User {current_user['email']} triggered AI Agent: '{prompt}'")
    
    execution_id = await ExecutionService.start_execution(current_user["id"], prompt)
    
    async def event_generator():
        try:
            async for event in AgentService.stream_agent(
                user_id=current_user["id"],
                execution_id=execution_id,
                prompt=prompt
            ):
                yield json.dumps(event) + "\n"
                
            await NotificationService.create_notification(
                user_id=current_user["id"],
                text=f"AI Agent loop completed successfully.",
                notification_type="AI Agent finished"
            )
        except Exception as e:
            logger.error(f"Event generator error: {e}")
            yield json.dumps({
                "event_type": "completed",
                "execution_id": execution_id,
                "timestamp": datetime.utcnow().isoformat(),
                "node_name": "failed",
                "status": "FAILED",
                "payload": {"output": f"Internal execution failure: {e}"}
            }) + "\n"
            
        yield json.dumps({"event_type": "done"}) + "\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/cancel/{execution_id}")
async def cancel_agent_execution(
    execution_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Gracefully cancels a running agent loop by marking its status database field CANCELLED.
    """
    success = await ExecutionService.cancel_execution(execution_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Execution not found or access denied.")
    return {"message": "Execution cancelled successfully."}
