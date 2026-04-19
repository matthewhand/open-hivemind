"""
Database session management with tenant scoping.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.db.base_class import get_current_tenant
from typing import Any

# Create engine
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})

# Session factory for regular sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class TenantScopedSession(Session):
    """Session that automatically scopes queries to current tenant."""
    
    def query(self, *entities: Any, **kwargs):
        """Override query to add tenant_id filter."""
        tenant_id = get_current_tenant()
        if tenant_id:
            # Apply tenant filter to the query
            q = super().query(*entities, **kwargs)
            # Check if any of the entities have tenant_id column
            for entity in entities:
                if hasattr(entity, 'tenant_id'):
                    q = q.filter(entity.tenant_id == tenant_id)
            return q
        return super().query(*entities, **kwargs)


# Session factory for tenant-scoped sessions
def create_tenant_scoped_session():
    """Create a new tenant-scoped session."""
    return TenantScopedSession(bind=engine, autocommit=False, autoflush=False)


def get_db():
    """Dependency to get DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_tenant_db():
    """Dependency to get a tenant-scoped DB session."""
    db = create_tenant_scoped_session()
    try:
        yield db
    finally:
        db.close()
