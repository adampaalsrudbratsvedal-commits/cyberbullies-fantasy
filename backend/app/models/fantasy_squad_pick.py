from sqlalchemy import Column, Integer, String, Boolean
from ..database import Base


class FantasySquadPick(Base):
    """Each league participant's fantasy squad picks."""
    __tablename__ = "fantasy_squad_picks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fifa_user_id = Column(Integer, index=True)
    fifa_username = Column(String, index=True)
    player_id = Column(Integer, index=True)       # FIFA Fantasy player ID
    player_name = Column(String, nullable=True)   # real player name from FIFA Fantasy
    national_team_name = Column(String, nullable=True, index=True)  # bridge to match data
    position_slot = Column(Integer)
    is_captain = Column(Boolean, default=False)
    is_vice_captain = Column(Boolean, default=False)
    is_starting = Column(Boolean, default=True)
    synced_round = Column(Integer)
