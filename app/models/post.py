"""
Post model for tenancy support.
"""
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text
from app.db.base_class import TenantAwareBase, Base


class Post(Base, TenantAwareBase):
    """
    Post model with tenant_id field.
    All posts belong to a specific tenant.
    """
    __tablename__ = "posts"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # tenant_id is inherited from TenantAwareBase
