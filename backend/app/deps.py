from typing import Generator

from sqlalchemy.orm import Session

from app.db.mongodb import db as mongo_db
from app.db.postgres import SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_mongo_db():
    return mongo_db
