import ssl
import re
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

def _build_engine(url: str):
    if url.startswith("postgresql://") or url.startswith("postgres://"):
        url = url.replace("postgresql://", "postgresql+pg8000://", 1) \
                 .replace("postgres://", "postgresql+pg8000://", 1)
        # Strip sslmode param — pg8000 uses ssl_context in connect_args instead
        url = re.sub(r'[?&]sslmode=[^&]*', '', url).rstrip('?').rstrip('&')
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        return create_engine(url, connect_args={"ssl_context": ssl_ctx})
    return create_engine(url)

engine = _build_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
