"""
Middleware to extract tenant_id from request header and set it in context.
"""
from fastapi import Request, HTTPException, Header
from starlette.middleware.base import BaseHTTPMiddleware
from app.db.base_class import set_current_tenant, get_current_tenant
from typing import Optional
from contextlib import asynccontextmanager
import uuid

# Header name for tenant ID
TENANT_HEADER = "X-Tenant-ID"


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware that extracts tenant_id from request header
    and sets it in the context for the duration of the request.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Extract tenant_id from header
        tenant_id: Optional[str] = request.headers.get(TENANT_HEADER)
        
        if not tenant_id:
            raise HTTPException(
                status_code=400,
                detail="Missing X-Tenant-ID header"
            )
        
        # Set tenant_id in context
        set_current_tenant(tenant_id)
        
        try:
            response = await call_next(request)
            return response
        finally:
            # Clean up context
            set_current_tenant(None)


async def verify_tenant_id(
    x_tenant_id: Optional[str] = Header(default=None, alias="X-Tenant-ID")
):
    """
    Dependency to verify tenant_id header is present.
    Alternative approach using FastAPI dependency injection.
    """
    if not x_tenant_id:
        raise HTTPException(
            status_code=400,
            detail="Missing X-Tenant-ID header"
        )
    set_current_tenant(x_tenant_id)
    return x_tenant_id
