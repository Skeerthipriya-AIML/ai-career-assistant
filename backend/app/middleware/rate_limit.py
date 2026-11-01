import time
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple memory-based sliding window rate limiting.
    """
    def __init__(self, app, limit_per_minute: int = 240):
        super().__init__(app)
        self.limit = limit_per_minute
        self.history = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        
        # Keep only timestamps within last 60 seconds
        self.history[client_ip] = [t for t in self.history[client_ip] if now - t < 60]
        
        if len(self.history[client_ip]) >= self.limit:
            raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute.")
            
        self.history[client_ip].append(now)
        return await call_next(request)
