"""
Tests for tenancy feature.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.base_class import Base, set_current_tenant
from app.models.post import Post




class TestTenantDependency:
    """Tests for tenant dependency injection."""
    
    def test_missing_tenant_header(self, client):
        """Test that requests without X-Tenant-ID header are rejected."""
        response = client.get("/api/v1/posts/")
        assert response.status_code == 400
        assert "Missing X-Tenant-ID header" in response.json()["detail"]
    
    def test_valid_tenant_header(self, client):
        """Test that requests with valid X-Tenant-ID header are accepted."""
        response = client.get("/api/v1/posts/", headers={"X-Tenant-ID": "tenant-1"})
        assert response.status_code == 200


class TestPostCRUD:
    """Tests for Post CRUD operations with tenant scoping."""
    
    def test_create_post(self, client):
        """Test creating a post."""
        response = client.post(
            "/api/v1/posts/",
            json={"title": "Test Post", "content": "Test Content"},
            headers={"X-Tenant-ID": "tenant-1"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == "Test Post"
        assert data["content"] == "Test Content"
        assert data["tenant_id"] == "tenant-1"
    
    def test_list_posts_empty(self, client):
        """Test listing posts when none exist."""
        response = client.get("/api/v1/posts/", headers={"X-Tenant-ID": "tenant-1"})
        assert response.status_code == 200
        assert response.json() == []
    
    def test_list_posts(self, client):
        """Test listing posts for a tenant."""
        # Create posts for tenant-1
        client.post(
            "/api/v1/posts/",
            json={"title": "Post 1", "content": "Content 1"},
            headers={"X-Tenant-ID": "tenant-1"}
        )
        client.post(
            "/api/v1/posts/",
            json={"title": "Post 2", "content": "Content 2"},
            headers={"X-Tenant-ID": "tenant-1"}
        )
        
        # Create post for tenant-2
        client.post(
            "/api/v1/posts/",
            json={"title": "Post 3", "content": "Content 3"},
            headers={"X-Tenant-ID": "tenant-2"}
        )
        
        # List posts for tenant-1
        response = client.get("/api/v1/posts/", headers={"X-Tenant-ID": "tenant-1"})
        assert response.status_code == 200
        posts = response.json()
        assert len(posts) == 2
        titles = [p["title"] for p in posts]
        assert "Post 1" in titles
        assert "Post 2" in titles
        assert "Post 3" not in titles
    
    def test_tenant_isolation(self, client):
        """Test that tenants are isolated from each other."""
        # Create post for tenant-1
        response1 = client.post(
            "/api/v1/posts/",
            json={"title": "Tenant 1 Post", "content": "Content"},
            headers={"X-Tenant-ID": "tenant-1"}
        )
        post1_id = response1.json()["id"]
        
        # Create post for tenant-2
        response2 = client.post(
            "/api/v1/posts/",
            json={"title": "Tenant 2 Post", "content": "Content"},
            headers={"X-Tenant-ID": "tenant-2"}
        )
        post2_id = response2.json()["id"]
        
        # Tenant 1 should not see tenant 2's post
        response = client.get("/api/v1/posts/", headers={"X-Tenant-ID": "tenant-1"})
        posts = response.json()
        assert len(posts) == 1
        assert posts[0]["id"] == post1_id
        
        # Tenant 2 should not see tenant 1's post
        response = client.get("/api/v1/posts/", headers={"X-Tenant-ID": "tenant-2"})
        posts = response.json()
        assert len(posts) == 1
        assert posts[0]["id"] == post2_id
    
    def test_get_post(self, client):
        """Test getting a specific post."""
        # Create post
        create_response = client.post(
            "/api/v1/posts/",
            json={"title": "Test", "content": "Test"},
            headers={"X-Tenant-ID": "tenant-1"}
        )
        post_id = create_response.json()["id"]
        
        # Get post
        response = client.get(
            f"/api/v1/posts/{post_id}",
            headers={"X-Tenant-ID": "tenant-1"}
        )
        assert response.status_code == 200
        assert response.json()["id"] == post_id
    
    def test_get_nonexistent_post(self, client):
        """Test getting a non-existent post."""
        response = client.get(
            "/api/v1/posts/nonexistent",
            headers={"X-Tenant-ID": "tenant-1"}
        )
        assert response.status_code == 404
    
    def test_delete_post(self, client):
        """Test deleting a post."""
        # Create post
        create_response = client.post(
            "/api/v1/posts/",
            json={"title": "Test", "content": "Test"},
            headers={"X-Tenant-ID": "tenant-1"}
        )
        post_id = create_response.json()["id"]
        
        # Delete post
        response = client.delete(
            f"/api/v1/posts/{post_id}",
            headers={"X-Tenant-ID": "tenant-1"}
        )
        assert response.status_code == 200
        
        # Verify deletion
        response = client.get(
            f"/api/v1/posts/{post_id}",
            headers={"X-Tenant-ID": "tenant-1"}
        )
        assert response.status_code == 404


class TestTenantScopedSession:
    """Tests for TenantScopedSession."""
    
    def test_session_scopes_to_tenant(self):
        """Test that TenantScopedSession automatically scopes queries to current tenant."""
        from app.tests.conftest import test_engine
        from app.db.session import TenantScopedSession
        from app.db.base_class import set_current_tenant
        
        # Setup - create posts directly using test engine
        db = TenantScopedSession(bind=test_engine, autocommit=False, autoflush=False)
        
        # Create posts for different tenants directly
        post1 = Post(id="post-1", title="T1 Post", content="Content", tenant_id="tenant-a")
        post2 = Post(id="post-2", title="T2 Post", content="Content", tenant_id="tenant-b")
        db.add_all([post1, post2])
        db.commit()
        
        # Test without tenant context - regular session should return all
        all_posts = db.query(Post).all()
        assert len(all_posts) == 2
        
        # Test with tenant-a context
        set_current_tenant("tenant-a")
        tenant_db = TenantScopedSession(bind=test_engine, autocommit=False, autoflush=False)
        
        posts = tenant_db.query(Post).all()
        assert len(posts) == 1
        assert posts[0].tenant_id == "tenant-a"
        
        # Test with tenant-b context
        set_current_tenant("tenant-b")
        posts = tenant_db.query(Post).all()
        assert len(posts) == 1
        assert posts[0].tenant_id == "tenant-b"
        
        # Cleanup
        set_current_tenant(None)
        tenant_db.close()
        db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
