import json
import urllib.parse
from datetime import datetime, timedelta

import httpx

from ..config import settings
from ..models.fifa_token import FifaToken

PINGONE_TOKEN_URL = (
    "https://auth.pingone.eu/3f85e2e1-0232-4f84-9da8-bba9279f1a23/as/token"
)
CLIENT_ID = "35072598-fc20-4142-a469-1b940db47e6f"


class TokenManager:
    def __init__(self):
        self._access_token: str = ""
        self._refresh_token: str = ""
        self._fp_user: str = ""
        self._expires_at: datetime | None = None

    def _load_env(self):
        self._refresh_token = settings.fifa_refresh_token
        self._fp_user = settings.fifa_fp_user
        if self._fp_user:
            try:
                data = json.loads(urllib.parse.unquote(self._fp_user))
                self._access_token = data.get("accessToken", "")
                expires_str = data.get("expires", "")
                if expires_str:
                    self._expires_at = datetime.fromisoformat(
                        expires_str.replace("Z", "")
                    )
            except Exception:
                pass

    _x_sid_db: str = ""

    def _load_db(self, db) -> bool:
        row = db.query(FifaToken).first()
        if row and row.fp_user:
            self._access_token = row.access_token or ""
            self._refresh_token = row.refresh_token or settings.fifa_refresh_token
            self._fp_user = row.fp_user
            self._expires_at = row.expires_at
            self._x_sid_db = row.x_sid or ""
            return True
        return False

    def _save_db(self, db):
        row = db.query(FifaToken).first()
        if not row:
            row = FifaToken()
            db.add(row)
        row.access_token = self._access_token
        row.refresh_token = self._refresh_token
        row.fp_user = self._fp_user
        row.expires_at = self._expires_at
        if self._x_sid_db:
            row.x_sid = self._x_sid_db
        db.commit()

    def _is_expired(self) -> bool:
        if not self._expires_at:
            return True
        return datetime.utcnow() >= self._expires_at - timedelta(minutes=5)

    def get_cookies(self) -> str:
        sid = self._x_sid_db or settings.fifa_sid
        return f"X-SID={sid}; fp.user={self._fp_user}"

    async def refresh(self, db=None) -> bool:
        if not self._refresh_token:
            return False
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    PINGONE_TOKEN_URL,
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": self._refresh_token,
                        "client_id": CLIENT_ID,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=4,
                )
                resp.raise_for_status()
                data = resp.json()

            self._access_token = data["access_token"]
            if "refresh_token" in data:
                self._refresh_token = data["refresh_token"]

            expires_in = data.get("expires_in", 3600)
            self._expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

            fp_data = json.loads(urllib.parse.unquote(self._fp_user))
            fp_data["accessToken"] = self._access_token
            fp_data["expires"] = self._expires_at.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            fp_data["expIn"] = expires_in
            self._fp_user = urllib.parse.quote(json.dumps(fp_data))

            if db:
                self._save_db(db)

            print(f"[TokenManager] Token refreshed, expires in {expires_in}s")
            return True

        except Exception as e:
            print(f"[TokenManager] Refresh failed: {e}")
            return False

    async def ensure_fresh(self, db=None):
        if not self._fp_user:
            if db:
                found = self._load_db(db)
                if not found:
                    self._load_env()
            else:
                self._load_env()

        if self._is_expired():
            await self.refresh(db)


token_manager = TokenManager()
