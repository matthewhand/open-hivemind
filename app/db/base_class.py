"""
Base SQLAlchemy model with tenant support.
"""
from sqlalchemy.orm import declarative_base, Mapped, mapped_column, declared_attr
from sqlalchemy import String
from contextvars import ContextVar
from typing import Optional

# Context variable to store current tenant_id
current_tenant: ContextVar[Optional[str]] = ContextVar('current_tenant', default=None)


class TenantAwareBase:
    """Base class that adds tenant_id to all models."""
    
    __allow_unmapped__ = True
    
    @declared_attr
    def __tablename__(cls):
        return cls.__name__.lower() + "s"
    
    tenant_id: Mapped[str] = mapped_column(String, index=True)


Base = declarative_base(cls=TenantAwareBase)


def get_current_tenant() -> Optional[str]:
    """Get the current tenant_id from context."""
    return current_tenant.get()


def set_current_tenant(tenant_id: Optional[str]):
    """Set the current tenant_id in context."""
    current_tenant.set(tenant_id)
