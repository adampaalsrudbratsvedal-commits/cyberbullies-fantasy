from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from .config import settings
from .database import engine, Base, get_db
from .routers import league, auth, admin, fantasy

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[DB] create_all failed (tables may already exist): {e}")

app = FastAPI(title="Cyberbullies Fantasy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(league.router)
app.include_router(admin.router)
app.include_router(fantasy.router)


@app.get("/")
def root():
    return {"status": "ok", "league": "Cyberbullies Fantasy"}


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"db": "ok"}
    except Exception as e:
        return {"db": "error", "message": str(e), "type": type(e).__name__}
