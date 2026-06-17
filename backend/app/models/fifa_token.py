from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base


class FifaToken(Base):
    __tablename__ = "fifa_tokens"

    id = Column(Integer, primary_key=True)
    access_token = Column(Text)
    refresh_token = Column(Text)
    fp_user = Column(Text)
    x_sid = Column(String, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
