from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from ..database import Base


class ProbabilitySnapshot(Base):
    __tablename__ = "probability_snapshots"

    id = Column(Integer, primary_key=True)
    round_id = Column(Integer, index=True)
    fifa_username = Column(String)
    win_probability = Column(Float)
    last_probability = Column(Float)
    expected_final = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
