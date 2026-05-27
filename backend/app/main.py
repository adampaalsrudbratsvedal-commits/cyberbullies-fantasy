from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base
from .routers import league, auth, admin

Base.metadata.create_all(bind=engine)

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


@app.get("/")
def root():
    return {"status": "ok", "league": "Cyberbullies Fantasy"}
