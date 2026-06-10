from sqlalchemy import Column, Integer, String, Boolean
from ..database import Base


class FantasySquadPick(Base):
    """Each league participant's fantasy squad picks."""
    __tablename__ = "fantasy_squad_picks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fifa_user_id = Column(Integer, index=True)
    fifa_username = Column(String, index=True)
    player_id = Column(Integer, index=True)   # references FantasyPlayer.id
    position_slot = Column(Integer)            # squad slot (1–15)
    is_captain = Column(Boolean, default=False)
    is_vice_captain = Column(Boolean, default=False)
    is_starting = Column(Boolean, default=True)   # True = XI, False = bench
    synced_round = Column(Integer)                 # round at time of sync
