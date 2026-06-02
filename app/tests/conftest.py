"""
Pytest configuration for tenancy tests.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base
from app.db.session import TenantScopedSession

# Test database setup
TEST_DATABASE_URL = "sqlite:///./test_tenancy.db"

# Create test engine and tables
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})


def get_test_tenant_db():
    """Test version of get_tenant_db that uses test engine."""
    db = TenantScopedSession(bind=test_engine, autocommit=False, autoflush=False)
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_and_teardown():
    """Create and drop tables for each test."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    """Test client fixture that overrides the database dependency."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_tenant_db
    
    # Override the get_tenant_db dependency with test version
    app.dependency_overrides[get_tenant_db] = get_test_tenant_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Clean up
    app.dependency_overrides.clear()
