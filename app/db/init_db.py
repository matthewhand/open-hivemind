"""
Database initialization and migration utilities.
"""
from app.db.base_class import Base
from app.db.session import engine


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)


def drop_db():
    """Drop all database tables."""
    Base.metadata.drop_all(bind=engine)


def reset_db():
    """Drop and recreate all tables."""
    drop_db()
    init_db()


if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Database tables created successfully.")
