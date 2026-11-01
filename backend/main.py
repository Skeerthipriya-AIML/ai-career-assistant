"""
Root entrypoint re-export for Vercel Serverless and ASGI runners.
"""
from app.main import app

__all__ = ["app"]
