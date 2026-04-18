"""
Post CRUD endpoints with tenant scoping.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import uuid4
from datetime import datetime

from app.models.post import Post
from app.db.session import get_tenant_db as get_tenant_db_dep
from app.db.base_class import get_current_tenant, set_current_tenant
from app.middleware.tenant_middleware import verify_tenant_id

router = APIRouter()


class PostCreate(BaseModel):
    """Request body for creating a post."""
    title: str
    content: str


@router.post("/posts/", response_model=dict)
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
    
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "tenant_id": post.tenant_id
    }


@router.get("/posts/", response_model=List[dict])
async def read_posts(
    tenant_id: str = Depends(verify_tenant_id),
    db: Session = Depends(get_tenant_db_dep)
):
    """Get all posts for the current tenant."""
    posts = db.query(Post).all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "content": p.content,
            "tenant_id": p.tenant_id
        }
        for p in posts
    ]


@router.get("/posts/{post_id}", response_model=dict)
async def read_post(
    post_id: str,
    tenant_id: str = Depends(verify_tenant_id),
    db: Session = Depends(get_tenant_db_dep)
):
    """Get a specific post by ID for the current tenant."""
    post = db.query(Post).filter(Post.id == post_id).first()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "tenant_id": post.tenant_id
    }


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    tenant_id: str = Depends(verify_tenant_id),
    db: Session = Depends(get_tenant_db_dep)
):
    """Delete a post by ID for the current tenant."""
    post = db.query(Post).filter(Post.id == post_id).first()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    db.delete(post)
    db.commit()
    
    return {"message": "Post deleted successfully"}
