from sqlalchemy import Column, Integer, String, Float
from ..database import Base


class FantasyPlayer(Base):
    """All FIFA Fantasy 2026 eligible players."""
    __tablename__ = "fantasy_players"

    id = Column(Integer, primary_key=True)   # FIFA Fantasy player ID (not autoincrement)
    name = Column(String, nullable=False)
    short_name = Column(String)
    national_team_id = Column(Integer)
    national_team_name = Column(String)
    position_id = Column(Integer)            # 1=GK  2=DEF  3=MID  4=FWD
    position_name = Column(String)
    price = Column(Float, default=0.0)
    total_points = Column(Integer, default=0)
