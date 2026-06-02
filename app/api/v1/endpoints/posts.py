"""
Post CRUD endpoints with tenant scoping.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List
from uuid import uuid4

from app.models.post import Post
from app.db.session import get_tenant_db as get_tenant_db_dep
from app.db.base_class import get_current_tenant
from app.middleware.tenant_middleware import verify_tenant_id

router = APIRouter()


class PostCreate(BaseModel):
    """Request body for creating a post."""
    title: str
    content: str


class PostResponse(BaseModel):
    """Serialized representation of a post returned by the API."""
    id: str
    title: str
    content: str
    tenant_id: str


def serialize_post(post: Post) -> PostResponse:
    """Build the public API representation of a post.

    Centralising serialization keeps every endpoint's response shape
    consistent and gives us a single, typed place to evolve it.
    """
    return PostResponse(
        id=post.id,
        title=post.title,
        content=post.content,
        tenant_id=post.tenant_id,
    )


def _get_owned_post(db: Session, post_id: str) -> Post:
    """Fetch a tenant-scoped post by id or raise 404 if it does not exist.

    The session is already scoped to the current tenant, so a missing row
    means either the post does not exist or it belongs to another tenant —
    both of which must look identical to the caller to avoid leaking the
    existence of other tenants' data.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/posts/", response_model=PostResponse)
async def create_post(
    post_data: PostCreate,
    tenant_id: str = Depends(verify_tenant_id),
    db: Session = Depends(get_tenant_db_dep)
):
    """Create a new post for the current tenant."""
    post_id = str(uuid4())

    # Current tenant is already set by verify_tenant_id dependency
    current_tenant = get_current_tenant()

    post = Post(
        id=post_id,
        title=post_data.title,
        content=post_data.content,
        tenant_id=current_tenant
    )

    db.add(post)
    db.commit()
    db.refresh(post)

    return serialize_post(post)


@router.get("/posts/", response_model=List[PostResponse])
async def read_posts(
    tenant_id: str = Depends(verify_tenant_id),
    db: Session = Depends(get_tenant_db_dep)
):
    """Get all posts for the current tenant."""
    posts = db.query(Post).all()
    return [serialize_post(p) for p in posts]


@router.get("/posts/{post_id}", response_model=PostResponse)
async def read_post(
    post_id: str,
    tenant_id: str = Depends(verify_tenant_id),
    db: Session = Depends(get_tenant_db_dep)
):
    """Get a specific post by ID for the current tenant."""
    post = _get_owned_post(db, post_id)
    return serialize_post(post)


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    tenant_id: str = Depends(verify_tenant_id),
    db: Session = Depends(get_tenant_db_dep)
):
    """Delete a post by ID for the current tenant."""
    post = _get_owned_post(db, post_id)

    db.delete(post)
    db.commit()

    return {"message": "Post deleted successfully"}
