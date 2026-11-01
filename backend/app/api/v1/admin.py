import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_admin
from app.services.admin_service import AdminService

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/metrics")
async def get_metrics(
    current_admin: dict = Depends(get_current_admin)
):
    """
    Returns aggregated telemetry usage stats and metrics for the Admin Dashboard panel.
    """
    try:
        metrics = await AdminService.get_system_metrics()
        return metrics
    except Exception as e:
        logger.error(f"Error fetching system telemetry metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve system telemetry metrics."
        )

@router.get("/audit-logs")
async def get_audit_logs(
    current_admin: dict = Depends(get_current_admin)
):
    """
    Returns recent system audit logs for administrative inspection.
    """
    from app.audit.audit_service import AuditService
    try:
        logs = await AuditService.get_audit_events(limit=50)
        return logs
    except Exception as e:
        logger.error(f"Error fetching audit logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch audit logs.")

@router.get("/health")
async def get_health_status(
    current_admin: dict = Depends(get_current_admin)
):
    """
    Performs active health checks on database connections and system metrics.
    """
    from app.database.connection import get_mongodb
    db = get_mongodb()
    db_status = "disconnected"
    if db is not None:
        try:
            await db.command("ping")
            db_status = "connected"
        except Exception:
            db_status = "unreachable"
            
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "api_service": "online",
        "timestamp": datetime.utcnow().isoformat()
    }
