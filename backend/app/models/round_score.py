from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from ..database import Base

class RoundScore(Base):
    __tablename__ = "round_scores"

    id = Column(Integer, primary_key=True, index=True)
    fifa_user_id = Column(Integer, index=True)
    fifa_username = Column(String)
    round_id = Column(Integer, index=True)
    round_points = Column(Float, nullable=True)
    overall_points = Column(Float, nullable=True)
    overall_rank = Column(Integer, nullable=True)
    round_rank = Column(Integer, nullable=True)
    synced_at = Column(DateTime(timezone=True), server_default=func.now())
