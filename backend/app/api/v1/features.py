from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict
from app.core.security import get_current_user, require_role
from app.features.feature_service import FeatureService

router = APIRouter()

@router.get("")
async def get_features() -> Dict[str, bool]:
    """
    Returns dynamic feature flag configurations.
    """
    return await FeatureService.get_all_flags()

@router.post("/{name}")
async def update_feature(
    name: str,
    enabled: bool,
    current_admin: dict = Depends(require_role(["ADMIN"]))
):
    """
    Toggles a specific feature flag state. (Admin privileges required)
    """
    success = await FeatureService.update_flag(name, enabled)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to toggle feature state.")
    return {"detail": f"Feature {name} updated to {enabled}."}
