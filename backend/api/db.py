import getpass
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


def _database_url() -> str:
    default_user = getpass.getuser()
    return os.environ.get(
        "DATABASE_URL",
        f"postgresql+psycopg2://{default_user}@localhost:5432/adsolve",
    )


engine = create_engine(_database_url())
_SessionLocal = sessionmaker(bind=engine)


def get_db() -> Session:
    """Yield a database session and ensure it is closed after use."""
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
