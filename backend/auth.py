import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, Request
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from models import User

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
JWT_SECRET           = os.getenv("JWT_SECRET", "please-change-this-secret-in-production")
ALGORITHM            = "HS256"
TOKEN_EXPIRE_DAYS    = 30

# APP_URL is the public base URL of the deployed app (same domain for frontend + backend)
APP_URL      = os.getenv("APP_URL", "http://localhost:8000")
REDIRECT_URI = f"{APP_URL}/api/auth/callback"

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_INFO_URL  = "https://www.googleapis.com/oauth2/v2/userinfo"

GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"
CALENDAR_SCOPES       = f"openid email profile {GOOGLE_CALENDAR_SCOPE}"
GOOGLE_REFRESH_URL    = "https://oauth2.googleapis.com/token"


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(user_id: int, email: str) -> str:
    exp = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "exp": exp},
        JWT_SECRET,
        algorithm=ALGORITHM,
    )


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

def get_current_user_id(request: Request) -> int:
    auth  = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    payload = _decode_token(token)
    try:
        return int(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token payload.")


def get_optional_user_id(request: Request) -> Optional[int]:
    """Like get_current_user_id but returns None instead of raising."""
    try:
        return get_current_user_id(request)
    except HTTPException:
        return None


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_or_create_user(
    db: Session, google_id: str, email: str, name: str, picture: str,
    access_token: str = None, refresh_token: str = None, token_expiry=None,
) -> User:
    user = db.query(User).filter(User.google_id == google_id).first()
    if user:
        user.name    = name
        user.picture = picture
        if access_token:
            user.google_access_token = access_token
        if refresh_token:
            user.google_refresh_token = refresh_token
        if token_expiry:
            user.google_token_expiry = token_expiry
        db.commit()
    else:
        user = User(
            google_id=google_id, email=email, name=name, picture=picture,
            google_access_token=access_token,
            google_refresh_token=refresh_token,
            google_token_expiry=token_expiry,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
