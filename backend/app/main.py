from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import league, auth, admin
from .services.token_manager import token_manager

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    token_manager.start()
    yield
    token_manager.stop()


app = FastAPI(title="Cyberbullies Fantasy", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://cyberbullies-fantasy.onrender.com"],
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
