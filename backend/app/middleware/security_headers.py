from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.config.config import settings

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        
        # Content Security Policy (CSP)
        csp_policies = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
            "font-src 'self' data: https://fonts.gstatic.com; "
            "img-src 'self' data: https://api.dicebear.com https://lh3.googleusercontent.com https://fastapi.tiangolo.com; "
            "connect-src 'self' ws: wss: http://localhost:8000 http://localhost:5173 http://localhost:5175 http://127.0.0.1:8000;"
        )
        response.headers["Content-Security-Policy"] = csp_policies
        
        # X-Frame-Options (Clickjacking defense)
        response.headers["X-Frame-Options"] = "DENY"
        
        # X-Content-Type-Options (Mime sniffing protection)
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Referrer-Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Strict-Transport-Security (STS)
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
            
        return response
