from sqlmodel import SQLModel, create_engine, Session
from typing import Generator
from contextlib import contextmanager
from app.core.config import get_settings

# Load settings (DATABASE_URL from .env or config.py)
settings = get_settings()
DATABASE_URL = settings.DATABASE_URL

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in environment variables.")

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    echo=False,  # set True for SQL debugging
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=10,  # number of connections to keep open
    max_overflow=20,  # extra connections allowed beyond pool_size
)


# Initialize DB tables (use Alembic for migrations in production)
def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    print("✅ Database tables created successfully!")


# Dependency for FastAPI routes
def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        try:
            yield session
        finally:
            session.close()


@contextmanager
def transaction_scope(session: Session):
    """
    Provide a transactional scope around a series of operations.
    Usage:
        with transaction_scope(session):
            crud.operation1(session, ..., commit=False)
            crud.operation2(session, ..., commit=False)
    """
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise