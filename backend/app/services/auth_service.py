import logging
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from app.repositories.user_repo import user_repo
from app.repositories.session_repo import session_repo
from app.repositories.token_repo import token_repo
from app.repositories.history_repo import history_repo
from app.core import security

logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    async def register_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
        email = user_data["email"].lower().strip()
        username = user_data["username"].lower().strip()
        plain_password = user_data["password"]

        # Validate duplicate email
        existing_email = await user_repo.find_by_email(email)
        if existing_email:
            raise HTTPException(status_code=400, detail="Account with this email already exists.")

        # Validate duplicate username
        existing_username = await user_repo.find_by_username(username)
        if existing_username:
            raise HTTPException(status_code=400, detail="Username is already taken.")

        # Validate password strength
        if not security.validate_password_strength(plain_password):
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters, and contain uppercase, lowercase, numbers, and special characters."
            )

        # Hash credentials
        hashed_password = security.get_password_hash(plain_password)
        new_user = {
            "email": email,
            "username": username,
            "name": user_data["name"].strip(),
            "password_hash": hashed_password,
            "role": "USER",
            "is_verified": False,
            "onboarded": False,
            "created_at": datetime.utcnow()
        }
        
        user_id = await user_repo.create(new_user)
        new_user["id"] = user_id

        # Generate Email Verification Token
        verification_token = security.generate_random_token()
        token_hash = AuthService._hash_token(verification_token)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        await token_repo.save_verification_code(email, token_hash, expires_at)
        
        # Simulate Welcome & Verification Email
        logger.info(f"== WELCOME EMAIL SIMULATOR ==")
        logger.info(f"To: {email}")
        logger.info(f"Verify registration URL: http://localhost:5173/verify-email?token={verification_token}")
        logger.info(f"=============================")

        return {
            "id": user_id,
            "email": email,
            "username": username,
            "name": new_user["name"],
            "role": "USER",
            "is_verified": False,
            "onboarded": False,
            "created_at": new_user["created_at"]
        }

    @staticmethod
    async def login_user(email: str, password_plain: str, user_agent: str, client_ip: str) -> Dict[str, Any]:
        email = email.lower().strip()
        user = await user_repo.find_by_email(email)
        
        if not user:
            # Prevent user enumeration side-channels by hashing dummy password
            security.verify_password("dummy", "dummy")
            await history_repo.log_login_attempt(email, client_ip, user_agent, False)
            raise HTTPException(status_code=401, detail="Incorrect email or password credentials.")

        # Check for account lockouts
        locked_until = user.get("locked_until")
        if locked_until and locked_until > datetime.utcnow():
            lock_duration = int((locked_until - datetime.utcnow()).total_seconds() / 60)
            raise HTTPException(
                status_code=403,
                detail=f"This account is locked due to repeated failed logins. Retry in {lock_duration} minutes."
            )

        # Verify password
        if not security.verify_password(password_plain, user.get("password_hash", "")):
            await history_repo.log_login_attempt(email, client_ip, user_agent, False)
            
            # Incremental Brute force checks
            failures = await history_repo.count_recent_failures(email, minutes=15)
            if failures >= 5:
                lock_time = datetime.utcnow() + timedelta(minutes=30)
                await user_repo.lock_account(email, lock_time)
                logger.warning(f"Account locked out for email={email} until {lock_time}")
                raise HTTPException(
                    status_code=403,
                    detail="This account has been locked for 30 minutes due to excessive login failures."
                )
                
            raise HTTPException(status_code=401, detail="Incorrect email or password credentials.")

        # Clear login failures
        await history_repo.log_login_attempt(email, client_ip, user_agent, True)

        # Setup User Session
        session_expires = datetime.utcnow() + timedelta(days=1)
        session_id = await session_repo.create_session(
            user_id=user["id"],
            user_agent=user_agent,
            client_ip=client_ip,
            expires_at=session_expires
        )

        user_role = user.get("role") or ("ADMIN" if user.get("is_admin") else "USER")
        token_data = {"sub": user["id"], "role": user_role, "sid": session_id}
        access_token = security.create_access_token(token_data)
        refresh_token = security.create_refresh_token(token_data)

        # Save refresh token hash
        rt_hash = AuthService._hash_token(refresh_token)
        await token_repo.save_refresh_token(
            token_hash=rt_hash,
            user_id=user["id"],
            session_id=session_id,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "username": user.get("username"),
                "role": user_role,
                "is_verified": user.get("is_verified", False),
                "onboarded": user.get("onboarded", False),
                "career_goal": user.get("career_goal"),
                "skills": user.get("skills", []),
                "preferred_companies": user.get("preferred_companies", []),
                "bio": user.get("bio"),
                "education": user.get("education"),
                "github_link": user.get("github_link"),
                "linkedin_link": user.get("linkedin_link"),
                "created_at": user.get("created_at")
            }
        }

    @staticmethod
    async def refresh_session(refresh_token: str, user_agent: str, client_ip: str) -> Dict[str, Any]:
        payload = security.verify_refresh_token(refresh_token)
        if not payload:
            raise HTTPException(status_code=401, detail="Malformed or expired refresh token.")

        rt_hash = AuthService._hash_token(refresh_token)
        saved_token = await token_repo.get_refresh_token(rt_hash)
        
        if not saved_token:
            raise HTTPException(status_code=401, detail="Refresh token has been revoked or is invalid.")

        # Check Token Abuse - Rotation Hijacking (Token Reuse detection)
        if saved_token.get("is_rotated", False):
            session_id = saved_token.get("session_id")
            user_id = saved_token.get("user_id")
            # Revoke entire session to mitigate hijack attempts
            await session_repo.revoke_session(session_id)
            await token_repo.revoke_tokens_by_session(session_id)
            logger.critical(f"REFRESH TOKEN REUSE DETECTED. Session {session_id} and user {user_id} tokens revoked!")
            raise HTTPException(status_code=401, detail="Security alert: Token reuse detected. Please re-authenticate.")

        # Mark current token as rotated
        await token_repo.mark_token_rotated(saved_token["id"])

        user_id = payload["sub"]
        role = payload.get("role", "USER")
        session_id = payload.get("sid")

        # Confirm session validity
        session = await session_repo.get_session(session_id)
        if not session or session.get("is_revoked", False):
            raise HTTPException(status_code=401, detail="User session has been revoked.")

        # Generate new credentials pair
        token_data = {"sub": user_id, "role": role, "sid": session_id}
        new_access_token = security.create_access_token(token_data)
        new_refresh_token = security.create_refresh_token(token_data)

        # Save new refresh token signature
        new_rt_hash = AuthService._hash_token(new_refresh_token)
        await token_repo.save_refresh_token(
            token_hash=new_rt_hash,
            user_id=user_id,
            session_id=session_id,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token
        }

    @staticmethod
    async def logout_session(refresh_token: str) -> None:
        payload = security.verify_refresh_token(refresh_token)
        if payload:
            session_id = payload.get("sid")
            if session_id:
                await session_repo.revoke_session(session_id)
                await token_repo.revoke_tokens_by_session(session_id)

    @staticmethod
    async def logout_all_sessions(user_id: str) -> None:
        await session_repo.revoke_all_user_sessions(user_id)
        # Find and clean all active refresh tokens associated with user sessions
        db = token_repo.collection.database
        await db["refresh_tokens"].delete_many({"user_id": user_id})

    @staticmethod
    async def verify_email(verification_token: str) -> bool:
        token_hash = AuthService._hash_token(verification_token)
        record = await token_repo.get_verification_code(token_hash)
        
        if not record:
            raise HTTPException(status_code=400, detail="Invalid verification link or code.")
            
        if record["expires_at"] < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Verification link has expired.")
            
        email = record["email"]
        await user_repo.mark_email_verified(email)
        await token_repo.delete_verification_code(email)
        return True

    @staticmethod
    async def resend_verification(email: str) -> None:
        email = email.lower().strip()
        user = await user_repo.find_by_email(email)
        if not user:
            # Silent fallback to protect user privacy
            return

        if user.get("is_verified", False):
            raise HTTPException(status_code=400, detail="Email is already verified.")

        verification_token = security.generate_random_token()
        token_hash = AuthService._hash_token(verification_token)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        await token_repo.save_verification_code(email, token_hash, expires_at)
        
        logger.info(f"== VERIFICATION EMAIL RESEND ==")
        logger.info(f"To: {email}")
        logger.info(f"Verify registration URL: http://localhost:5173/verify-email?token={verification_token}")
        logger.info(f"=============================")

    @staticmethod
    async def forgot_password(email: str) -> None:
        email = email.lower().strip()
        user = await user_repo.find_by_email(email)
        if not user:
            # Silent fallback
            return

        reset_token = security.generate_random_token()
        token_hash = AuthService._hash_token(reset_token)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        await token_repo.save_reset_code(email, token_hash, expires_at)

        logger.info(f"== PASSWORD RESET SIMULATOR ==")
        logger.info(f"To: {email}")
        logger.info(f"Reset URL: http://localhost:5173/reset-password?token={reset_token}")
        logger.info(f"=============================")

    @staticmethod
    async def reset_password(token: str, new_password_plain: str) -> bool:
        token_hash = AuthService._hash_token(token)
        record = await token_repo.get_reset_code(token_hash)
        
        if not record:
            raise HTTPException(status_code=400, detail="Invalid password reset token.")
            
        if record["expires_at"] < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Password reset token has expired.")

        if not security.validate_password_strength(new_password_plain):
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters, and contain uppercase, lowercase, numbers, and special characters."
            )

        email = record["email"]
        user = await user_repo.find_by_email(email)
        if not user:
            raise HTTPException(status_code=400, detail="User account associated with this token not found.")

        hashed_password = security.get_password_hash(new_password_plain)
        await user_repo.update_password(user["id"], hashed_password)
        await token_repo.delete_reset_code(email)
        
        # Clear lockout if reset successfully
        db = user_repo.collection.database
        await db["users"].update_one({"_id": user["_id"]}, {"$unset": {"locked_until": ""}})
        return True

    @staticmethod
    async def google_oauth_login(oauth_token: str, email: str, name: str, avatar: Optional[str]) -> Dict[str, Any]:
        email = email.lower().strip()
        user = await user_repo.find_by_email(email)
        
        if user:
            # Profile exists: Link Google if not linked
            if user.get("oauth_provider") != "google":
                await user_repo.update_oauth_provider(user["id"], "google", oauth_token[:64])
        else:
            # Registration: Create profile
            random_username = f"google_{name.lower().replace(' ', '_')[:10]}_{security.generate_random_token()[:6]}"
            new_user = {
                "email": email,
                "username": random_username,
                "name": name,
                "password_hash": security.get_password_hash(security.generate_random_token()), # Random password
                "role": "USER",
                "is_verified": True,  # Google verifies email
                "onboarded": False,
                "avatar": avatar,
                "oauth_provider": "google",
                "oauth_id": oauth_token[:64],
                "created_at": datetime.utcnow()
            }
            user_id = await user_repo.create(new_user)
            user = new_user
            user["id"] = user_id

        # Setup Active Session
        session_expires = datetime.utcnow() + timedelta(days=1)
        session_id = await session_repo.create_session(
            user_id=user["id"],
            user_agent="Google OAuth Gateway",
            client_ip="0.0.0.0",
            expires_at=session_expires
        )

        token_data = {"sub": user["id"], "role": user.get("role", "USER"), "sid": session_id}
        access_token = security.create_access_token(token_data)
        refresh_token = security.create_refresh_token(token_data)

        rt_hash = AuthService._hash_token(refresh_token)
        await token_repo.save_refresh_token(
            token_hash=rt_hash,
            user_id=user["id"],
            session_id=session_id,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "username": user.get("username"),
                "role": user.get("role", "USER"),
                "is_verified": user.get("is_verified", True),
                "onboarded": user.get("onboarded", False),
                "career_goal": user.get("career_goal"),
                "skills": user.get("skills", []),
                "preferred_companies": user.get("preferred_companies", []),
                "bio": user.get("bio"),
                "education": user.get("education"),
                "github_link": user.get("github_link"),
                "linkedin_link": user.get("linkedin_link"),
                "created_at": user.get("created_at")
            }
        }
