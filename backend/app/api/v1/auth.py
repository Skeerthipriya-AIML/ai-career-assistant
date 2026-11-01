import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from app.core.security import get_current_user
from app.schemas.schemas import (
    UserCreate, UserLogin, OAuthLogin, UserResponse, TokenResponse,
    PasswordResetRequest, PasswordResetConfirm, EmailVerificationRequest, ProfileUpdate,
    UserPreferences
)
from app.services.auth_service import AuthService
from app.repositories.user_repo import user_repo

logger = logging.getLogger(__name__)
router = APIRouter()
users_router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, request: Request):
    """
    Registers a new email/password user in MongoDB and triggers verification.
    """
    try:
        user = await AuthService.register_user(user_data.dict())
        
        user_agent = request.headers.get("User-Agent", "unknown")
        client_ip = request.client.host if request.client else "127.0.0.1"
        from app.audit.audit_service import AuditService
        await AuditService.log_audit_event(
            user_id=user["id"],
            email=user["email"],
            event_type="REGISTER",
            client_ip=client_ip,
            user_agent=user_agent,
            details={"username": user["username"]}
        )
        return user
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"User registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error occurred while registering user account."
        )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request, response: Response):
    """
    Validates user credentials, creates a session, and sets HTTPOnly cookie for refresh token.
    """
    user_agent = request.headers.get("User-Agent", "unknown")
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    try:
        result = await AuthService.login_user(
            email=credentials.email,
            password_plain=credentials.password,
            user_agent=user_agent,
            client_ip=client_ip
        )
        
        # Set HTTPOnly refresh token cookie
        response.set_cookie(
            key="refresh_token",
            value=result["refresh_token"],
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=7 * 24 * 3600  # 7 days
        )
        
        from app.audit.audit_service import AuditService
        await AuditService.log_audit_event(
            user_id=result["user"]["id"],
            email=result["user"]["email"],
            event_type="LOGIN",
            client_ip=client_ip,
            user_agent=user_agent,
            details={"role": result["user"]["role"]}
        )
        
        return {
            "access_token": result["access_token"],
            "user": result["user"]
        }
    except HTTPException as he:
        if he.status_code in [401, 403]:
            from app.audit.audit_service import AuditService
            await AuditService.log_audit_event(
                user_id=None,
                email=credentials.email,
                event_type="FAILED_LOGIN",
                client_ip=client_ip,
                user_agent=user_agent,
                details={"reason": he.detail}
            )
        raise he
    except Exception as e:
        logger.error(f"User login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error occurred during authentication."
        )

@router.post("/oauth", response_model=TokenResponse)
async def oauth_login(payload: OAuthLogin, request: Request, response: Response):
    """
    Handles Google OAuth logins. Links account if email matches or registers profile.
    """
    email = payload.email or f"{payload.provider}_user@ai-career.com"
    name = payload.name or "OAuth User"
    user_agent = request.headers.get("User-Agent", "unknown")
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    try:
        result = await AuthService.google_oauth_login(
            oauth_token=payload.token,
            email=email,
            name=name,
            avatar=payload.avatar
        )
        
        response.set_cookie(
            key="refresh_token",
            value=result["refresh_token"],
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=7 * 24 * 3600
        )
        
        from app.audit.audit_service import AuditService
        await AuditService.log_audit_event(
            user_id=result["user"]["id"],
            email=result["user"]["email"],
            event_type="LOGIN",
            client_ip=client_ip,
            user_agent=user_agent,
            details={"provider": payload.provider}
        )
        
        return {
            "access_token": result["access_token"],
            "user": result["user"]
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"OAuth login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error occurred during OAuth authentication."
        )

@router.post("/logout")
async def logout(request: Request, response: Response):
    """
    Logs out user, revoking session and refresh tokens.
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        # Fallback to body read
        try:
            body = await request.json()
            refresh_token = body.get("refresh_token")
        except Exception:
            pass

    user_id = None
    if refresh_token:
        from app.core import security
        payload = security.verify_refresh_token(refresh_token)
        if payload:
            user_id = payload.get("sub")
        await AuthService.logout_session(refresh_token)

    user_agent = request.headers.get("User-Agent", "unknown")
    client_ip = request.client.host if request.client else "127.0.0.1"
    from app.audit.audit_service import AuditService
    await AuditService.log_audit_event(
        user_id=user_id,
        email=None,
        event_type="LOGOUT",
        client_ip=client_ip,
        user_agent=user_agent,
        details={"scope": "single_session"}
    )

    response.delete_cookie("refresh_token")
    return {"detail": "Logged out successfully."}

@router.post("/logout-all")
async def logout_all(request: Request, current_user: dict = Depends(get_current_user), response: Response = None):
    """
    Logs out from all devices, revoking all active sessions.
    """
    try:
        await AuthService.logout_all_sessions(current_user["id"])
        
        user_agent = request.headers.get("User-Agent", "unknown")
        client_ip = request.client.host if request.client else "127.0.0.1"
        from app.audit.audit_service import AuditService
        await AuditService.log_audit_event(
            user_id=current_user["id"],
            email=current_user["email"],
            event_type="LOGOUT",
            client_ip=client_ip,
            user_agent=user_agent,
            details={"scope": "all_sessions"}
        )
        
        if response:
            response.delete_cookie("refresh_token")
        return {"detail": "Successfully logged out from all devices."}
    except Exception as e:
        logger.error(f"Logout all devices error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke sessions across devices."
        )

@router.post("/refresh")
async def refresh(request: Request, response: Response):
    """
    Performs Refresh Token Rotation (RTR) to issue a new access/refresh pair.
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        try:
            body = await request.json()
            refresh_token = body.get("refresh_token")
        except Exception:
            pass

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is missing."
        )

    user_agent = request.headers.get("User-Agent", "unknown")
    client_ip = request.client.host if request.client else "127.0.0.1"

    try:
        result = await AuthService.refresh_session(
            refresh_token=refresh_token,
            user_agent=user_agent,
            client_ip=client_ip
        )
        
        response.set_cookie(
            key="refresh_token",
            value=result["refresh_token"],
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=7 * 24 * 3600
        )
        
        return {"access_token": result["access_token"]}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to rotate refresh token."
        )

@router.post("/forgot-password")
async def forgot_password(payload: PasswordResetRequest):
    """
    Initiates password reset by issuing secure code.
    """
    await AuthService.forgot_password(payload.email)
    return {"detail": "If the account exists, a reset link has been dispatched."}

@router.post("/reset-password")
async def reset_password(payload: PasswordResetConfirm, request: Request):
    """
    Overrides hashed password with new confirmed credentials.
    """
    token_hash = AuthService._hash_token(payload.token)
    from app.repositories.token_repo import token_repo
    record = await token_repo.get_reset_code(token_hash)
    email = record["email"] if record else None
    
    await AuthService.reset_password(payload.token, payload.password)
    
    user_agent = request.headers.get("User-Agent", "unknown")
    client_ip = request.client.host if request.client else "127.0.0.1"
    from app.audit.audit_service import AuditService
    await AuditService.log_audit_event(
        user_id=None,
        email=email,
        event_type="PASSWORD_CHANGE",
        client_ip=client_ip,
        user_agent=user_agent,
        details={"status": "success"}
    )
    return {"detail": "Password has been successfully updated."}

@router.post("/verify-email")
async def verify_email(payload: EmailVerificationRequest, request: Request):
    """
    Verifies user registration using secure URL code.
    """
    token_hash = AuthService._hash_token(payload.token)
    from app.repositories.token_repo import token_repo
    record = await token_repo.get_verification_code(token_hash)
    email = record["email"] if record else None
    
    await AuthService.verify_email(payload.token)
    
    user_agent = request.headers.get("User-Agent", "unknown")
    client_ip = request.client.host if request.client else "127.0.0.1"
    from app.audit.audit_service import AuditService
    await AuditService.log_audit_event(
        user_id=None,
        email=email,
        event_type="EMAIL_VERIFICATION",
        client_ip=client_ip,
        user_agent=user_agent,
        details={"status": "verified"}
    )
    return {"detail": "Email verified successfully."}

@router.post("/resend-verification")
async def resend_verification(payload: PasswordResetRequest):
    """
    Resends verification code to the registered email.
    """
    await AuthService.resend_verification(payload.email)
    return {"detail": "If the email is verified, no dispatch occurs. Otherwise, verification is sent."}

@router.get("/sessions")
async def get_active_sessions(current_user: dict = Depends(get_current_user)):
    """
    Returns active login sessions associated with the user account.
    """
    from app.repositories.session_repo import session_repo
    sessions = await session_repo.get_user_sessions(current_user["id"])
    return sessions

@router.delete("/sessions/{session_id}")
async def revoke_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """
    Revokes a specific session.
    """
    from app.repositories.session_repo import session_repo
    session = await session_repo.get_session(session_id)
    if not session or session["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    await session_repo.revoke_session(session_id)
    from app.repositories.token_repo import token_repo
    await token_repo.revoke_tokens_by_session(session_id)
    return {"detail": "Session revoked successfully."}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Returns authenticated user profile.
    """
    return current_user

@users_router.get("/users/preferences", response_model=UserPreferences)
async def get_preferences(current_user: dict = Depends(get_current_user)):
    """
    Returns user configurations settings.
    """
    from app.repositories.preferences_repo import preferences_repo
    pref = await preferences_repo.get_preferences(current_user["id"])
    return pref

@users_router.patch("/users/preferences", response_model=UserPreferences)
async def update_preferences(payload: UserPreferences, current_user: dict = Depends(get_current_user)):
    """
    Updates user configuration settings.
    """
    from app.repositories.preferences_repo import preferences_repo
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    await preferences_repo.update_preferences(current_user["id"], update_data)
    pref = await preferences_repo.get_preferences(current_user["id"])
    return pref

@users_router.patch("/users/profile", response_model=UserResponse)
async def update_profile(payload: ProfileUpdate, request: Request, current_user: dict = Depends(get_current_user)):
    """
    Updates authenticated user skills, bio, education, and social parameters.
    """
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    
    # Check duplicate username
    if "username" in update_data:
        existing = await user_repo.find_by_username(update_data["username"])
        if existing and existing["id"] != current_user["id"]:
            raise HTTPException(status_code=400, detail="Username is already taken.")
            
    # Check role change
    role_change = False
    old_role = current_user.get("role")
    new_role = update_data.get("role")
    if new_role and new_role != old_role:
        role_change = True

    await user_repo.update_profile(current_user["id"], update_data)
    updated_user = await user_repo.find_by_id(current_user["id"])
    
    user_agent = request.headers.get("User-Agent", "unknown")
    client_ip = request.client.host if request.client else "127.0.0.1"
    from app.audit.audit_service import AuditService
    
    if role_change:
        await AuditService.log_audit_event(
            user_id=current_user["id"],
            email=current_user["email"],
            event_type="ROLE_CHANGE",
            client_ip=client_ip,
            user_agent=user_agent,
            details={"old_role": old_role, "new_role": new_role}
        )
    else:
        await AuditService.log_audit_event(
            user_id=current_user["id"],
            email=current_user["email"],
            event_type="PROFILE_UPDATE",
            client_ip=client_ip,
            user_agent=user_agent,
            details={"keys_updated": list(update_data.keys())}
        )
        
    return updated_user

@users_router.delete("/users/account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """
    Removes user profile and session logs from DB.
    """
    await AuthService.logout_all_sessions(current_user["id"])
    await user_repo.delete_user(current_user["id"])
    return {"detail": "User account deleted successfully."}
