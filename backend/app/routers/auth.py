from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from ..database import get_db
from ..models.user import User
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


class UserCreate(BaseModel):
    username: str
    password: str
    fifa_username: str | None = None


def create_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({**data, "exp": expire}, settings.secret_key, algorithm=settings.algorithm)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    user = db.query(User).filter_by(username=username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return user


@router.post("/register")
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter_by(username=data.username).first():
        raise HTTPException(status_code=400, detail="Username taken")
    user = User(
        username=data.username,
        hashed_password=pwd_context.hash(data.password),
        fifa_username=data.fifa_username,
    )
    db.add(user)
    db.commit()
    return {"message": "User created"}


@router.post("/token")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=form.username).first()
    if not user or not pwd_context.verify(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong credentials")
    return {"access_token": create_token({"sub": user.username}), "token_type": "bearer"}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "fifa_username": current_user.fifa_username,
        "is_admin": current_user.is_admin,
        "has_fifa_sid": bool(current_user.fifa_sid),
    }


class FifaSidUpdate(BaseModel):
    fifa_sid: str


@router.put("/me/fifa-sid")
def update_fifa_sid(data: FifaSidUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Store the user's own FIFA X-SID cookie for accurate mid-round squad sync."""
    sid = data.fifa_sid.strip()
    # Accept full cookie string like "X-SID=abc123" or just the value
    if sid.startswith("X-SID="):
        sid = sid[len("X-SID="):]
    current_user.fifa_sid = sid
    db.commit()
    return {"ok": True}
