"""
Tests for the posts endpoint serialization helpers and edge-case behavior.

These complement ``test_tenancy.py`` (which exercises tenant isolation) by
focusing on the serialization contract and the response shapes produced by the
``serialize_post`` / ``_get_owned_post`` helpers extracted from the endpoints.
"""
import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.posts import (
    PostResponse,
    serialize_post,
    _get_owned_post,
)
from app.db.base_class import set_current_tenant
from app.db.session import TenantScopedSession
from app.models.post import Post


# The exact set of keys the public API contract promises for a post.
POST_RESPONSE_KEYS = {"id", "title", "content", "tenant_id"}


class TestSerializePost:
    """Unit tests for the serialize_post helper."""

    def test_returns_post_response_model(self):
        post = Post(id="p1", title="Hello", content="World", tenant_id="tenant-1")
        result = serialize_post(post)
        assert isinstance(result, PostResponse)

    def test_maps_all_fields(self):
        post = Post(id="p2", title="T", content="C", tenant_id="tenant-x")
        result = serialize_post(post)
        assert result.id == "p2"
        assert result.title == "T"
        assert result.content == "C"
        assert result.tenant_id == "tenant-x"

    def test_response_exposes_exactly_the_public_keys(self):
        """The serialized payload must not leak extra model columns."""
        post = Post(id="p3", title="T", content="C", tenant_id="tenant-1")
        payload = serialize_post(post).model_dump()
        assert set(payload.keys()) == POST_RESPONSE_KEYS

    def test_serialization_is_stable_across_calls(self):
        post = Post(id="p4", title="T", content="C", tenant_id="tenant-1")
        assert serialize_post(post).model_dump() == serialize_post(post).model_dump()


class TestGetOwnedPost:
    """Unit tests for the _get_owned_post tenant-scoped lookup helper."""

    def test_raises_404_when_missing(self):
        from app.tests.conftest import test_engine

        set_current_tenant("tenant-1")
        db = TenantScopedSession(bind=test_engine, autocommit=False, autoflush=False)
        try:
            with pytest.raises(HTTPException) as exc_info:
                _get_owned_post(db, "does-not-exist")
            assert exc_info.value.status_code == 404
            assert exc_info.value.detail == "Post not found"
        finally:
            db.close()
            set_current_tenant(None)

    def test_returns_post_when_present(self):
        from app.tests.conftest import test_engine

        db = TenantScopedSession(bind=test_engine, autocommit=False, autoflush=False)
        db.add(Post(id="owned-1", title="T", content="C", tenant_id="tenant-1"))
        db.commit()

        set_current_tenant("tenant-1")
        scoped = TenantScopedSession(bind=test_engine, autocommit=False, autoflush=False)
        try:
            found = _get_owned_post(scoped, "owned-1")
            assert found.id == "owned-1"
        finally:
            scoped.close()
            db.close()
            set_current_tenant(None)

    def test_other_tenants_post_is_indistinguishable_from_missing(self):
        """A cross-tenant lookup must 404, not leak the other tenant's row."""
        from app.tests.conftest import test_engine

        db = TenantScopedSession(bind=test_engine, autocommit=False, autoflush=False)
        db.add(Post(id="secret-1", title="T", content="C", tenant_id="tenant-a"))
        db.commit()
        db.close()

        set_current_tenant("tenant-b")
        scoped = TenantScopedSession(bind=test_engine, autocommit=False, autoflush=False)
        try:
            with pytest.raises(HTTPException) as exc_info:
                _get_owned_post(scoped, "secret-1")
            assert exc_info.value.status_code == 404
        finally:
            scoped.close()
            set_current_tenant(None)


class TestEndpointResponseContract:
    """End-to-end checks that endpoints honor the typed response model."""

    def test_create_returns_only_public_keys(self, client):
        response = client.post(
            "/api/v1/posts/",
            json={"title": "Hi", "content": "There"},
            headers={"X-Tenant-ID": "tenant-1"},
        )
        assert response.status_code == 200
        assert set(response.json().keys()) == POST_RESPONSE_KEYS

    def test_list_items_share_the_response_contract(self, client):
        client.post(
            "/api/v1/posts/",
            json={"title": "A", "content": "B"},
            headers={"X-Tenant-ID": "tenant-1"},
        )
        response = client.get("/api/v1/posts/", headers={"X-Tenant-ID": "tenant-1"})
        assert response.status_code == 200
        body = response.json()
        assert body, "expected at least one post"
        for item in body:
            assert set(item.keys()) == POST_RESPONSE_KEYS

    def test_delete_nonexistent_returns_404(self, client):
        response = client.delete(
            "/api/v1/posts/nope",
            headers={"X-Tenant-ID": "tenant-1"},
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Post not found"

    def test_delete_then_get_is_404(self, client):
        created = client.post(
            "/api/v1/posts/",
            json={"title": "Temp", "content": "Temp"},
            headers={"X-Tenant-ID": "tenant-1"},
        )
        post_id = created.json()["id"]

        assert client.delete(
            f"/api/v1/posts/{post_id}", headers={"X-Tenant-ID": "tenant-1"}
        ).status_code == 200

        assert client.get(
            f"/api/v1/posts/{post_id}", headers={"X-Tenant-ID": "tenant-1"}
        ).status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
