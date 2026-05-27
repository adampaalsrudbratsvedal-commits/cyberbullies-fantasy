from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///./cyberbullies.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    fifa_league_id: int = 13217
    fifa_base_url: str = "https://play.fifa.com/api/en/fantasy"
    fifa_sid: str = ""
    fifa_fp_user: str = ""
    fifa_refresh_token: str = ""

    cors_origins: list[str] = ["http://localhost:5173"]

    league_name: str = "Cyberbullies"
    monte_carlo_mean: float = 60.0
    monte_carlo_std: float = 15.0
    monte_carlo_simulations: int = 10000

    class Config:
        env_file = ".env"

settings = Settings()
