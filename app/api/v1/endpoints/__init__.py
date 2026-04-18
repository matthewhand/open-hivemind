"""
API v1 endpoints.
"""
from app.api.v1.endpoints.posts import router as posts_router

__all__ = ["posts_router"]
