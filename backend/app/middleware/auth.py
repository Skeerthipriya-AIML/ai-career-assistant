from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import verify_access_token

security = HTTPBearer()

async def auth_required(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency helper to validate token and raise HTTP 401 if invalid.
    """
    token = credentials.credentials
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token or session expired")
    return payload
