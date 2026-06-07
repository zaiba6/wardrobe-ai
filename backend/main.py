import json
import os
import random
import re
import shutil
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode

import requests as http_requests
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from ai import analyze_inspo_image, detect_all_items, suggest_personalized_outfit, suggest_vibe_outfit, tag_clothing_image
from taxonomy import VALID_SUBTYPES as SUBTYPES
from auth import (
    GOOGLE_AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
    GOOGLE_INFO_URL, GOOGLE_TOKEN_URL, REDIRECT_URI, APP_URL,
    create_access_token, get_current_user_id, get_optional_user_id,
    get_or_create_user, CALENDAR_SCOPES,
)
from database import Base, engine, get_db
from models import ClothingItem, InspoItem, OutfitLog, OutfitFeedback, User, UserPreset, StyleBoard, UserSettings
from weather import get_weather, get_weather_by_coords

load_dotenv()

Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# DB migrations (add columns that appeared after initial schema)
# ---------------------------------------------------------------------------
_MIGRATIONS = [
    "ALTER TABLE clothing_items ADD COLUMN subtype VARCHAR",
    "ALTER TABLE clothing_items ADD COLUMN user_id INTEGER",
    "ALTER TABLE inspo_items    ADD COLUMN user_id INTEGER",
    "ALTER TABLE inspo_items    ADD COLUMN source_url VARCHAR",
    "CREATE TABLE IF NOT EXISTS outfit_feedback (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, item_ids TEXT NOT NULL, item_descs TEXT, occasion VARCHAR, feedback VARCHAR DEFAULT 'bad', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS user_presets (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, label VARCHAR NOT NULL, occasion TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "ALTER TABLE users ADD COLUMN google_access_token VARCHAR",
    "ALTER TABLE users ADD COLUMN google_refresh_token VARCHAR",
    "ALTER TABLE users ADD COLUMN google_token_expiry DATETIME",
    "CREATE TABLE IF NOT EXISTS style_boards (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, label VARCHAR NOT NULL, rules TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "ALTER TABLE inspo_items ADD COLUMN style_board_id INTEGER",
    "CREATE TABLE IF NOT EXISTS user_settings (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE, style_vibes TEXT, disabled_rules TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
]
with engine.connect() as _conn:
    for _stmt in _MIGRATIONS:
        try:
            _conn.execute(text(_stmt))
            _conn.commit()
        except Exception:
            pass

# ---------------------------------------------------------------------------
# App & CORS
# ---------------------------------------------------------------------------

app = FastAPI(title="Wardrobe AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_data_dir = Path(os.getenv("DATA_DIR", "."))
UPLOAD_DIR = _data_dir / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def save_upload(file: UploadFile) -> str:
    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    if not ext:
        ext = ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    with open(UPLOAD_DIR / filename, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return filename


def _delete_upload_file(filename: str) -> None:
    try:
        (UPLOAD_DIR / filename).unlink(missing_ok=True)
    except Exception:
        pass


def serialize_clothing(item: ClothingItem) -> dict:
    return {
        "id": item.id,
        "filename": item.filename,
        "image_url": f"/uploads/{item.filename}",
        "type": item.type,
        "subtype": item.subtype,
        "color": item.color,
        "fit": item.fit,
        "formality": item.formality,
        "season": item.season,
        "description": item.description,
        "user_notes": item.user_notes,
        "created_at": item.created_at.isoformat(),
    }


def serialize_inspo(item: InspoItem) -> dict:
    return {
        "id": item.id,
        "image_url": f"/uploads/{item.filename}",
        "items_detected": json.loads(item.items_detected or "[]"),
        "style_notes": item.style_notes,
        "style_board_id": item.style_board_id,
        "created_at": item.created_at.isoformat(),
    }


def serialize_outfit_log(log: OutfitLog) -> dict:
    return {
        "id": log.id,
        "items": json.loads(log.items or "[]"),
        "mood": log.mood,
        "occasion": log.occasion,
        "weather_city": log.weather_city,
        "weather_temp_c": log.weather_temp_c,
        "weather_condition": log.weather_condition,
        "worn_at": log.worn_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Weather resolution
# ---------------------------------------------------------------------------

def _resolve_weather(city: Optional[str], lat: Optional[float], lon: Optional[float]) -> dict:
    if lat is not None and lon is not None:
        return get_weather_by_coords(lat, lon)
    if city:
        return get_weather(city)
    raise HTTPException(status_code=400, detail="Provide either a city name or coordinates.")


# ---------------------------------------------------------------------------
# Mood / fit / formality mappings
# ---------------------------------------------------------------------------

MOOD_FIT: dict[str, list[str]] = {
    "Comfy":        ["loose", "oversized"],
    "Casual":       ["loose", "oversized", "regular"],
    "Confident":    ["fitted", "bodycon", "regular"],
    "Flowy":        ["loose", "oversized"],
    "Put-together": ["regular", "fitted"],
}

MOOD_FORMALITY: dict[str, list[str]] = {
    "Comfy":        ["casual"],
    "Casual":       ["casual", "smart-casual"],
    "Confident":    ["casual", "smart-casual", "formal"],
    "Flowy":        ["casual", "smart-casual"],
    "Put-together": ["smart-casual", "formal"],
}

INSPO_TYPE_TO_WARDROBE: dict[str, str] = {
    "trouser": "bottom", "pant": "bottom", "jean": "bottom", "skirt": "skirt",
    "shorts": "bottom", "blazer": "outerwear", "jacket": "outerwear",
    "coat": "outerwear", "cardigan": "outerwear", "vest": "outerwear",
    "dress": "dress", "jumpsuit": "jumpsuit", "romper": "jumpsuit",
    "top": "top", "shirt": "top", "blouse": "top", "tee": "top",
    "sweater": "top", "hoodie": "top", "tank": "top",
    "sneaker": "shoes", "shoe": "shoes", "boot": "shoes", "heel": "shoes",
    "loafer": "shoes", "sandal": "shoes",
    "bag": "accessory", "hat": "accessory", "scarf": "accessory",
    "belt": "accessory", "jewel": "accessory", "necklace": "accessory",
    "earring": "accessory", "watch": "accessory", "sunglass": "accessory",
}


def _map_inspo_type_to_wardrobe(inspo_type: str) -> str:
    lower = inspo_type.lower()
    for kw, wtype in INSPO_TYPE_TO_WARDROBE.items():
        if kw in lower:
            return wtype
    return "top"


# ---------------------------------------------------------------------------
# Outfit builder
# ---------------------------------------------------------------------------

def _build_outfit(tops, bottoms, dresses, outerwear, shoes, mood, weather, outfit_index):
    temp  = weather["temp_celsius"]
    items = []

    if mood == "Flowy" and dresses:
        items.append(random.choice(dresses))
    else:
        if not tops or not bottoms:
            return None
        items.append(tops[outfit_index % len(tops)])
        items.append(bottoms[outfit_index % len(bottoms)])

    if temp < 10 and outerwear:
        items.append(random.choice(outerwear))
    elif 10 <= temp < 18 and outerwear and random.random() > 0.5:
        items.append(random.choice(outerwear))

    if shoes:
        items.append(random.choice(shoes))

    temp_str = f"{temp}°C ({weather['temp_fahrenheit']}°F)"
    condition = weather["description"]
    warmth_note = (
        f"keeps you warm in {temp_str} {condition} weather" if temp < 10
        else f"suits the mild {temp_str} {condition} weather" if temp < 18
        else f"perfect for {temp_str} {condition} weather"
    )
    mood_notes = {
        "Comfy": "relaxed and comfortable", "Casual": "effortlessly casual",
        "Confident": "bold and put-together", "Flowy": "soft, romantic, and effortless",
        "Put-together": "polished and smart",
    }
    reason = f"Feeling {mood_notes.get(mood, 'stylish')} — this outfit {warmth_note}."
    return {"items": [serialize_clothing(i) for i in items], "reason": reason}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ClothingUpdateBody(BaseModel):
    type:        Optional[str] = None
    subtype:     Optional[str] = None
    color:       Optional[str] = None
    fit:         Optional[str] = None
    formality:   Optional[str] = None
    season:      Optional[str] = None
    description: Optional[str] = None
    user_notes:  Optional[str] = None


class SaveDetectedBody(BaseModel):
    filename: str
    items:    list[dict]


class OutfitSuggestBody(BaseModel):
    mood:        str
    city:        Optional[str]   = None
    lat:         Optional[float] = None
    lon:         Optional[float] = None
    occasion:    Optional[str]   = None
    exclude_ids: list[int]       = []


class VibeOutfitBody(BaseModel):
    vibe: str
    city: Optional[str]  = None
    lat:  Optional[float] = None
    lon:  Optional[float] = None
    mood: Optional[str]  = None


class OutfitLogBody(BaseModel):
    items:             list[dict]
    mood:              Optional[str]   = None
    occasion:          Optional[str]   = None
    weather_city:      Optional[str]   = None
    weather_temp_c:    Optional[float] = None
    weather_condition: Optional[str]   = None


class SaveFromUrlBody(BaseModel):
    image_url: str


class PinterestImportBody(BaseModel):
    board_url: str
    max_pins:  int = 12


class InspoOutfitBody(BaseModel):
    inspo_ids: list[int]
    city:      Optional[str]   = None
    lat:       Optional[float] = None
    lon:       Optional[float] = None
    mood:      Optional[str]   = None


class OutfitFeedbackBody(BaseModel):
    item_ids:  list[int]
    occasion:  Optional[str] = None
    feedback:  str           = "bad"   # "bad" | "loved"


class UserPresetBody(BaseModel):
    label:    str
    occasion: str


class DayPlanInput(BaseModel):
    date:     str            # YYYY-MM-DD
    day:      str            # "Monday" etc
    events:   list[str] = [] # event names from Google Cal
    occasion: Optional[str] = None  # user-typed override for empty days


class WeekPlanBody(BaseModel):
    days: list[DayPlanInput]
    city: Optional[str]   = None
    lat:  Optional[float] = None
    lon:  Optional[float] = None
    mood: Optional[str]   = None


# ---------------------------------------------------------------------------
# Google token refresh helper
# ---------------------------------------------------------------------------

def _get_valid_google_token(user: User, db: Session) -> str | None:
    """Return a valid Google access token, refreshing if needed."""
    if not user.google_access_token:
        return None
    if user.google_token_expiry and datetime.utcnow() < user.google_token_expiry:
        return user.google_access_token
    # Refresh
    if not user.google_refresh_token:
        return None
    try:
        r = http_requests.post("https://oauth2.googleapis.com/token", data={
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "refresh_token": user.google_refresh_token,
            "grant_type":    "refresh_token",
        }, timeout=10)
        data = r.json()
        user.google_access_token = data.get("access_token", user.google_access_token)
        expires_in = data.get("expires_in", 3600)
        user.google_token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
        db.commit()
        return user.google_access_token
    except Exception:
        return None


# ===========================================================================
# Routes
# ===========================================================================

@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Auth — Google OAuth
# ---------------------------------------------------------------------------

@app.get("/api/auth/google")
def auth_google():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured.")
    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  REDIRECT_URI,
        "response_type": "code",
        "scope":         CALENDAR_SCOPES,
        "access_type":   "offline",
        "prompt":        "select_account",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@app.get("/api/auth/callback")
def auth_callback(code: str, db: Session = Depends(get_db)):
    # Exchange code → tokens
    token_resp = http_requests.post(GOOGLE_TOKEN_URL, data={
        "client_id":     GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code":          code,
        "redirect_uri":  REDIRECT_URI,
        "grant_type":    "authorization_code",
    }, timeout=10)
    token_data   = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Google OAuth failed.")

    google_access  = token_data.get("access_token")
    google_refresh = token_data.get("refresh_token")
    expires_in     = token_data.get("expires_in", 3600)
    token_expiry   = datetime.utcnow() + timedelta(seconds=expires_in)

    # Get Google user profile
    info_resp = http_requests.get(
        GOOGLE_INFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    info = info_resp.json()

    user  = get_or_create_user(db, info["id"], info["email"], info.get("name", ""), info.get("picture", ""),
                                access_token=google_access, refresh_token=google_refresh, token_expiry=token_expiry)
    token = create_access_token(user.id, user.email)

    # Redirect to frontend with token in query param
    return RedirectResponse(f"{APP_URL}/?token={token}")


@app.get("/api/auth/me")
def get_me(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"id": user.id, "email": user.email, "name": user.name, "picture": user.picture}


# ---------------------------------------------------------------------------
# Clothing
# ---------------------------------------------------------------------------

@app.post("/api/clothes/upload")
def upload_clothing(
    image:      UploadFile = File(...),
    user_notes: str        = Form(""),
    user_id:    int        = Depends(get_current_user_id),
    db:         Session    = Depends(get_db),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")
    filename   = save_upload(image)
    image_path = str(UPLOAD_DIR / filename)
    try:
        tags = tag_clothing_image(image_path)
    except RuntimeError as exc:
        _delete_upload_file(filename)
        raise HTTPException(status_code=500, detail=str(exc))

    item = ClothingItem(
        user_id=user_id, filename=filename,
        type=tags.get("type", "top"), subtype=tags.get("subtype"),
        color=tags.get("color", "unknown"), fit=tags.get("fit", "regular"),
        formality=tags.get("formality", "casual"), season=tags.get("season", "all-season"),
        description=tags.get("description", ""), user_notes=user_notes or None,
    )
    db.add(item); db.commit(); db.refresh(item)
    return serialize_clothing(item)


@app.post("/api/clothes/detect")
def detect_clothing(
    image:   UploadFile = File(...),
    user_id: int        = Depends(get_current_user_id),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")
    filename   = save_upload(image)
    image_path = str(UPLOAD_DIR / filename)
    try:
        items = detect_all_items(image_path)
    except RuntimeError as exc:
        _delete_upload_file(filename)
        raise HTTPException(status_code=500, detail=str(exc))
    return {"filename": filename, "image_url": f"/uploads/{filename}", "items": items}


@app.post("/api/clothes/save-detected")
def save_detected(
    body:    SaveDetectedBody,
    user_id: int             = Depends(get_current_user_id),
    db:      Session         = Depends(get_db),
):
    saved = []
    for tags in body.items:
        item = ClothingItem(
            user_id=user_id, filename=body.filename,
            type=tags.get("type", "top"), subtype=tags.get("subtype"),
            color=tags.get("color", "unknown"), fit=tags.get("fit", "regular"),
            formality=tags.get("formality", "casual"), season=tags.get("season", "all-season"),
            description=tags.get("description", ""),
        )
        db.add(item)
        saved.append(item)
    db.commit()
    for item in saved:
        db.refresh(item)
    return [serialize_clothing(i) for i in saved]


@app.get("/api/subtypes")
def get_subtypes():
    return SUBTYPES


@app.get("/api/clothes")
def list_clothes(
    type:      Optional[str] = None,
    subtype:   Optional[str] = None,
    fit:       Optional[str] = None,
    formality: Optional[str] = None,
    season:    Optional[str] = None,
    user_id:   int           = Depends(get_current_user_id),
    db:        Session       = Depends(get_db),
):
    q = db.query(ClothingItem).filter(ClothingItem.user_id == user_id)
    if type:      q = q.filter(ClothingItem.type == type)
    if subtype:   q = q.filter(ClothingItem.subtype == subtype)
    if fit:       q = q.filter(ClothingItem.fit == fit)
    if formality: q = q.filter(ClothingItem.formality == formality)
    if season:    q = q.filter(ClothingItem.season == season)
    return [serialize_clothing(i) for i in q.order_by(ClothingItem.created_at.desc()).all()]


@app.put("/api/clothes/{item_id}")
def update_clothing(
    item_id: int,
    body:    ClothingUpdateBody,
    user_id: int                = Depends(get_current_user_id),
    db:      Session            = Depends(get_db),
):
    item = db.query(ClothingItem).filter(ClothingItem.id == item_id, ClothingItem.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    db.commit(); db.refresh(item)
    return serialize_clothing(item)


@app.delete("/api/clothes/{item_id}")
def delete_clothing(
    item_id: int,
    user_id: int     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    item = db.query(ClothingItem).filter(ClothingItem.id == item_id, ClothingItem.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    filename = item.filename
    db.delete(item); db.commit()
    if db.query(ClothingItem).filter(ClothingItem.filename == filename).count() == 0:
        _delete_upload_file(filename)
    return {"success": True}


@app.delete("/api/clothes/photo/{filename}")
def delete_photo(filename: str, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    items = db.query(ClothingItem).filter(
        ClothingItem.filename == filename,
        ClothingItem.user_id == user_id,
    ).all()
    if not items:
        raise HTTPException(status_code=404, detail="Photo not found.")
    for item in items:
        db.delete(item)
    db.commit()
    _delete_upload_file(filename)
    return {"success": True, "deleted": len(items)}


# ---------------------------------------------------------------------------
# User settings helpers
# ---------------------------------------------------------------------------

def _get_user_settings(user_id: int, db) -> tuple[list[str], list[str]]:
    """Returns (style_vibes, disabled_rules) for the user."""
    s = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not s:
        return [], []
    return json.loads(s.style_vibes or "[]"), json.loads(s.disabled_rules or "[]")


class SettingsUpdate(BaseModel):
    style_vibes:    Optional[list[str]] = None
    disabled_rules: Optional[list[str]] = None


@app.get("/api/settings")
def get_settings(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    vibes, disabled = _get_user_settings(user_id, db)
    return {"style_vibes": vibes, "disabled_rules": disabled}


@app.patch("/api/settings")
def update_settings(body: SettingsUpdate, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    s = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not s:
        s = UserSettings(user_id=user_id)
        db.add(s)
    if body.style_vibes is not None:
        s.style_vibes = json.dumps(body.style_vibes)
    if body.disabled_rules is not None:
        s.disabled_rules = json.dumps(body.disabled_rules)
    s.updated_at = datetime.utcnow()
    db.commit()
    return {"style_vibes": json.loads(s.style_vibes or "[]"), "disabled_rules": json.loads(s.disabled_rules or "[]")}


@app.get("/api/settings/rules")
def get_rule_definitions():
    from fashion_rules import RULE_DEFINITIONS
    return RULE_DEFINITIONS


# ---------------------------------------------------------------------------
# Style boards
# ---------------------------------------------------------------------------

def _find_matching_board(occasion: str | None, boards: list) -> object | None:
    """Fuzzy-match occasion text to a StyleBoard by label."""
    if not occasion or not boards:
        return None
    occ_lower = occasion.lower()
    for board in boards:
        if board.label.lower() in occ_lower or occ_lower in board.label.lower():
            return board
    return None


class StyleBoardCreate(BaseModel):
    label: str
    rules: Optional[str] = None


class StyleBoardUpdate(BaseModel):
    label: Optional[str] = None
    rules: Optional[str] = None


class InspoAssignBoard(BaseModel):
    board_id: Optional[int] = None


@app.get("/api/style-boards")
def list_style_boards(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    boards = db.query(StyleBoard).filter(StyleBoard.user_id == user_id).order_by(StyleBoard.created_at).all()
    return [{"id": b.id, "label": b.label, "rules": b.rules} for b in boards]


@app.post("/api/style-boards")
def create_style_board(body: StyleBoardCreate, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    board = StyleBoard(user_id=user_id, label=body.label.strip(), rules=body.rules)
    db.add(board); db.commit(); db.refresh(board)
    return {"id": board.id, "label": board.label, "rules": board.rules}


@app.patch("/api/style-boards/{board_id}")
def update_style_board(board_id: int, body: StyleBoardUpdate, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    board = db.query(StyleBoard).filter(StyleBoard.id == board_id, StyleBoard.user_id == user_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if body.label is not None:
        board.label = body.label.strip()
    if body.rules is not None:
        board.rules = body.rules
    db.commit()
    return {"id": board.id, "label": board.label, "rules": board.rules}


@app.delete("/api/style-boards/{board_id}")
def delete_style_board(board_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    board = db.query(StyleBoard).filter(StyleBoard.id == board_id, StyleBoard.user_id == user_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    db.delete(board); db.commit()
    return {"ok": True}


@app.post("/api/inspo/{inspo_id}/board")
def assign_inspo_to_board(inspo_id: int, body: InspoAssignBoard, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    item = db.query(InspoItem).filter(InspoItem.id == inspo_id, InspoItem.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inspo item not found")
    item.style_board_id = body.board_id
    db.commit()
    return {"ok": True, "board_id": body.board_id}


# ---------------------------------------------------------------------------
# Outfit suggestion (mood-based)
# ---------------------------------------------------------------------------

@app.post("/api/outfit/feedback")
def outfit_feedback(body: OutfitFeedbackBody, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Store a thumbs-down (or thumbs-up) on an outfit so future suggestions avoid it."""
    # Build human-readable descriptions for the rejected items
    items = db.query(ClothingItem).filter(ClothingItem.id.in_(body.item_ids)).all()
    descs = [f"{i.color} {i.subtype or i.type}" for i in items]
    fb = OutfitFeedback(
        user_id=user_id,
        item_ids=json.dumps(body.item_ids),
        item_descs=json.dumps(descs),
        occasion=body.occasion,
        feedback=body.feedback,
    )
    db.add(fb); db.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Saved occasion presets
# ---------------------------------------------------------------------------

@app.get("/api/presets")
def list_presets(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    presets = db.query(UserPreset).filter(UserPreset.user_id == user_id).order_by(UserPreset.created_at).all()
    return [{"id": p.id, "label": p.label, "occasion": p.occasion} for p in presets]

@app.post("/api/presets")
def create_preset(body: UserPresetBody, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    p = UserPreset(user_id=user_id, label=body.label.strip(), occasion=body.occasion.strip())
    db.add(p); db.commit(); db.refresh(p)
    return {"id": p.id, "label": p.label, "occasion": p.occasion}

@app.delete("/api/presets/{preset_id}")
def delete_preset(preset_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    p = db.query(UserPreset).filter(UserPreset.id == preset_id, UserPreset.user_id == user_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Preset not found.")
    db.delete(p); db.commit()
    return {"success": True}


@app.post("/api/outfit/suggest")
def suggest_outfit(body: OutfitSuggestBody, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    weather     = _resolve_weather(body.city, body.lat, body.lon)
    all_clothes = db.query(ClothingItem).filter(ClothingItem.user_id == user_id).all()
    if not all_clothes:
        return {"weather": weather, "outfit": {"items": [], "reason": "Your wardrobe is empty — upload some clothing items first!"}}

    # Build inspo taste context from user's saved inspo board
    inspo_items   = db.query(InspoItem).filter(InspoItem.user_id == user_id).all()
    inspo_context = "; ".join(
        it.style_notes for it in inspo_items if it.style_notes
    )[:2000]

    # Load recent bad recs so Claude can avoid those combos
    bad_recs = db.query(OutfitFeedback).filter(
        OutfitFeedback.user_id == user_id,
        OutfitFeedback.feedback == "bad",
    ).order_by(OutfitFeedback.created_at.desc()).limit(30).all()
    bad_combos = [json.loads(r.item_descs) for r in bad_recs if r.item_descs]

    wardrobe_summary = [
        {"id": c.id, "type": c.type, "subtype": c.subtype, "color": c.color,
         "description": c.description, "formality": c.formality, "fit": c.fit, "season": c.season}
        for c in all_clothes
    ]

    # Style board rules for this occasion
    style_boards  = db.query(StyleBoard).filter(StyleBoard.user_id == user_id).all()
    board         = _find_matching_board(body.occasion, style_boards)
    board_rules   = board.rules if board else None
    board_inspo_ctx = ""
    if board:
        board_items = db.query(InspoItem).filter(
            InspoItem.user_id == user_id, InspoItem.style_board_id == board.id
        ).all()
        board_inspo_ctx = "; ".join(i.style_notes for i in board_items if i.style_notes)[:500]

    style_vibes, disabled_rules = _get_user_settings(user_id, db)

    reason   = "Here's a look for you!"
    selected = []
    try:
        item_ids, reason = suggest_personalized_outfit(
            wardrobe_items=wardrobe_summary,
            inspo_context=inspo_context,
            mood=body.mood,
            occasion=body.occasion,
            weather=weather,
            exclude_ids=body.exclude_ids,
            bad_combos=bad_combos,
            board_rules=board_rules,
            board_inspo=board_inspo_ctx,
            style_vibes=style_vibes,
            disabled_rules=disabled_rules,
        )
        id_order = {iid: idx for idx, iid in enumerate(item_ids)}
        selected = sorted(
            [c for c in all_clothes if c.id in set(item_ids)],
            key=lambda c: id_order.get(c.id, 999),
        )
    except Exception:
        pass

    return {"weather": weather, "outfit": {"items": [serialize_clothing(c) for c in selected], "reason": reason}}


# ---------------------------------------------------------------------------
# Outfit suggestion (AI vibe-based)
# ---------------------------------------------------------------------------

@app.post("/api/outfit/vibe")
def suggest_vibe_outfit_endpoint(body: VibeOutfitBody, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    weather     = _resolve_weather(body.city, body.lat, body.lon)
    all_clothes = db.query(ClothingItem).filter(ClothingItem.user_id == user_id).all()
    if not all_clothes:
        return {"weather": weather, "outfit": {"items": [], "reason": "Your wardrobe is empty! Upload some clothing items first."}}

    wardrobe_summary = [{"id": c.id, "type": c.type, "subtype": c.subtype, "color": c.color, "description": c.description, "formality": c.formality, "fit": c.fit, "season": c.season} for c in all_clothes]
    reason = "Here's a styled look for you!"
    selected = []
    try:
        item_ids, reason = suggest_vibe_outfit(wardrobe_summary, body.vibe, weather, body.mood)
        id_order = {iid: idx for idx, iid in enumerate(item_ids)}
        selected = sorted([c for c in all_clothes if c.id in set(item_ids)], key=lambda c: id_order.get(c.id, 999))
    except Exception:
        pass
    return {"weather": weather, "outfit": {"items": [serialize_clothing(i) for i in selected], "reason": reason}}


# ---------------------------------------------------------------------------
# Outfit from inspo selection
# ---------------------------------------------------------------------------

@app.post("/api/outfit/from-inspo")
def outfit_from_inspo(body: InspoOutfitBody, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    weather     = _resolve_weather(body.city, body.lat, body.lon)
    all_clothes = db.query(ClothingItem).filter(ClothingItem.user_id == user_id).all()
    if not all_clothes:
        return {"weather": weather, "outfit": {"items": [], "reason": "Your wardrobe is empty! Upload some clothing items first."}}

    inspo_items = db.query(InspoItem).filter(InspoItem.id.in_(body.inspo_ids[:10])).all()

    # Build a vibe description from style notes and detected item types
    vibe_parts = []
    for it in inspo_items:
        if it.style_notes:
            vibe_parts.append(it.style_notes)
        for d in json.loads(it.items_detected or "[]"):
            t = d.get("type", "").strip()
            c = d.get("color", "").strip()
            if t:
                vibe_parts.append(f"{c} {t}".strip() if c else t)
    vibe = "; ".join(vibe_parts) if vibe_parts else "stylish, curated look"

    wardrobe_summary = [{"id": c.id, "type": c.type, "subtype": c.subtype, "color": c.color, "description": c.description, "formality": c.formality, "fit": c.fit, "season": c.season} for c in all_clothes]
    reason = "Here's a look inspired by your saved vibes!"
    selected = []
    try:
        item_ids, reason = suggest_vibe_outfit(wardrobe_summary, vibe, weather, body.mood)
        id_order = {iid: idx for idx, iid in enumerate(item_ids)}
        selected = sorted([c for c in all_clothes if c.id in set(item_ids)], key=lambda c: id_order.get(c.id, 999))
    except Exception:
        pass
    return {"weather": weather, "outfit": {"items": [serialize_clothing(i) for i in selected], "reason": reason}}


# ---------------------------------------------------------------------------
# Outfit log (worn history)
# ---------------------------------------------------------------------------

@app.post("/api/outfits/log")
def log_outfit(body: OutfitLogBody, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    log = OutfitLog(
        user_id=user_id, items=json.dumps(body.items),
        mood=body.mood, occasion=body.occasion,
        weather_city=body.weather_city, weather_temp_c=body.weather_temp_c,
        weather_condition=body.weather_condition,
    )
    db.add(log); db.commit(); db.refresh(log)
    return serialize_outfit_log(log)


@app.get("/api/outfits/log")
def get_outfit_log(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    logs = db.query(OutfitLog).filter(OutfitLog.user_id == user_id).order_by(OutfitLog.worn_at.desc()).all()
    return [serialize_outfit_log(l) for l in logs]


@app.delete("/api/outfits/log/{log_id}")
def delete_outfit_log(log_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    log = db.query(OutfitLog).filter(OutfitLog.id == log_id, OutfitLog.user_id == user_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Outfit log not found.")
    db.delete(log); db.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Inspo
# ---------------------------------------------------------------------------

@app.post("/api/inspo/upload")
def upload_inspo(
    image:   UploadFile         = File(...),
    user_id: Optional[int]      = Depends(get_optional_user_id),
    db:      Session            = Depends(get_db),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")
    filename   = save_upload(image)
    image_path = str(UPLOAD_DIR / filename)
    try:
        result = analyze_inspo_image(image_path)
    except RuntimeError as exc:
        _delete_upload_file(filename)
        raise HTTPException(status_code=500, detail=str(exc))
    item = InspoItem(user_id=user_id, filename=filename, items_detected=json.dumps(result.get("items", [])), style_notes=result.get("style_notes", ""))
    db.add(item); db.commit(); db.refresh(item)
    return serialize_inspo(item)


@app.get("/api/inspo")
def list_inspo(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    items = db.query(InspoItem).filter(InspoItem.user_id == user_id).order_by(InspoItem.created_at.desc()).all()
    return [serialize_inspo(i) for i in items]


@app.delete("/api/inspo/{item_id}")
def delete_inspo(item_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    item = db.query(InspoItem).filter(InspoItem.id == item_id, InspoItem.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inspo item not found.")
    _delete_upload_file(item.filename)
    db.delete(item); db.commit()
    return {"success": True}


@app.get("/api/inspo/recommendations")
def inspo_recommendations(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    inspo_items = db.query(InspoItem).filter(InspoItem.user_id == user_id).all()
    type_counts: dict[str, int] = {}
    for inspo in inspo_items:
        for d in json.loads(inspo.items_detected or "[]"):
            rt = d.get("type", "").strip().lower()
            if rt: type_counts[rt] = type_counts.get(rt, 0) + 1

    if not type_counts:
        return {"recommendations": [], "total_inspo_items": len(inspo_items)}

    all_clothes = db.query(ClothingItem).filter(ClothingItem.user_id == user_id).all()
    wardrobe_counts = {}
    for c in all_clothes:
        wardrobe_counts[c.type] = wardrobe_counts.get(c.type, 0) + 1

    recs = []
    for rt, count in type_counts.items():
        if count < 3: continue
        mapped = _map_inspo_type_to_wardrobe(rt)
        owned = wardrobe_counts.get(mapped, 0)
        if owned > 0: continue  # already have it — skip
        recs.append({"item_type": rt, "inspo_count": count, "owned_count": 0,
                     "suggestion": f"You've saved {rt} {count} time{'s' if count != 1 else ''} — this could be a great addition to complete your capsule look."})
    recs.sort(key=lambda r: r["inspo_count"], reverse=True)
    return {"recommendations": recs, "total_inspo_items": len(inspo_items)}


# ---------------------------------------------------------------------------
# Pinterest board import
# ---------------------------------------------------------------------------

_PINTEREST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
}

_IMG_DL_HEADERS = {
    **_PINTEREST_HEADERS,
    "Referer": "https://www.pinterest.com/",
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
}

def _upgrade_pinterest_img_url(url: str) -> str:
    """Swap any resolution Pinterest CDN path to 736x."""
    return re.sub(r'/\d+x/', '/736x/', url)

def _extract_images_from_rss(xml_bytes: bytes, max_pins: int) -> list[str]:
    """Extract image URLs from any RSS/Atom variant Pinterest might return."""
    ns = {"media": "http://search.yahoo.com/mrss/"}
    root = ET.fromstring(xml_bytes)
    urls: list[str] = []
    for item in root.iter():
        if len(urls) >= max_pins:
            break
        tag = item.tag.split("}")[-1]  # strip namespace
        if tag in ("thumbnail", "content") and item.get("url"):
            urls.append(_upgrade_pinterest_img_url(item.get("url")))
        elif tag == "description":
            for m in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\']', item.text or ""):
                if len(urls) < max_pins:
                    urls.append(_upgrade_pinterest_img_url(m.group(1)))
    return list(dict.fromkeys(urls))  # dedupe, preserve order


def _fetch_pinterest_rss(board_url: str) -> bytes:
    """Try several URL patterns to get the RSS feed. Returns raw bytes or raises."""
    base = board_url.rstrip("/")
    candidates = [
        base + "/rss/",
        base + "/feed.rss",
        base + ".rss",
    ]
    last_status = None
    for rss_url in candidates:
        try:
            r = http_requests.get(rss_url, headers=_PINTEREST_HEADERS, timeout=15, allow_redirects=True)
            if r.status_code == 200 and (b"<rss" in r.content[:500] or b"<feed" in r.content[:500] or b"<?xml" in r.content[:100]):
                return r.content
            last_status = r.status_code
        except Exception:
            continue
    raise HTTPException(
        status_code=400,
        detail=(
            f"Pinterest didn't return a valid feed (last status: {last_status}). "
            "Make sure the board is public — go to the board, tap ··· → Edit → uncheck 'Keep this board secret'."
        ),
    )


def _resolve_pinterest_url(raw: str) -> str:
    """
    Accept any of:
      - pin.it shortlinks  (e.g. https://pin.it/VmcyIJRkR)
      - Any country Pinterest domain  (pinterest.ca, pinterest.co.uk, …)
      - Standard pinterest.com board URLs
    Returns a canonical https://www.pinterest.com/user/board/ URL (no query params).
    Raises HTTPException on invalid input.
    """
    url = raw.strip()
    if not url.startswith("http"):
        url = "https://" + url

    # Resolve pin.it shortlinks by following redirects
    if "pin.it" in url:
        try:
            r = http_requests.get(url, headers=_PINTEREST_HEADERS, timeout=10, allow_redirects=True)
            url = r.url  # final URL after all redirects
        except Exception:
            raise HTTPException(status_code=502, detail="Could not resolve the pin.it shortlink — check your connection.")

    # Strip query params (invite codes, UTM, etc.)
    url = url.split("?")[0].rstrip("/")

    # Accept any pinterest.* country domain and normalise to www.pinterest.com
    url = re.sub(r"https?://(?:www\.)?pinterest\.[a-z.]+", "https://www.pinterest.com", url)

    if "pinterest.com" not in url:
        raise HTTPException(status_code=400, detail="Please enter a Pinterest board URL or a pin.it shortlink.")

    # Validate it's a board URL (must have /username/boardname/)
    path = url.replace("https://www.pinterest.com", "").strip("/")
    parts = [p for p in path.split("/") if p]
    if len(parts) < 2 or parts[0] == "pin":
        raise HTTPException(
            status_code=400,
            detail="That looks like a pin or profile URL, not a board. Open the board in Pinterest, copy the URL from the address bar, and paste it here.",
        )

    return url


@app.post("/api/inspo/import-pinterest")
def import_pinterest_board(
    body:    PinterestImportBody,
    user_id: int     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    try:
        url = _resolve_pinterest_url(body.board_url)
    except HTTPException:
        raise

    try:
        rss_bytes = _fetch_pinterest_rss(url)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach Pinterest — check your connection and try again.")

    try:
        img_urls = _extract_images_from_rss(rss_bytes, body.max_pins)
    except ET.ParseError:
        raise HTTPException(status_code=400, detail="Could not parse the Pinterest feed. The board may be private or empty.")

    if not img_urls:
        raise HTTPException(status_code=400, detail="No pin images found in this board. It may be empty, private, or the URL isn't a board.")

    # Build a set of source URLs already imported by this user so we skip duplicates
    existing_urls: set[str] = {
        row.source_url
        for row in db.query(InspoItem.source_url)
                      .filter(InspoItem.user_id == user_id, InspoItem.source_url.isnot(None))
                      .all()
        if row.source_url
    }

    imported: list[InspoItem] = []
    skipped = 0
    for img_url in img_urls:
        # Normalise to the canonical 736x URL for dedup comparison
        canonical_url = _upgrade_pinterest_img_url(img_url)
        if canonical_url in existing_urls:
            skipped += 1
            continue
        try:
            fallback_url = re.sub(r'/736x/', '/236x/', canonical_url)
            img_resp = None
            for try_url in ([canonical_url] if canonical_url == fallback_url else [canonical_url, fallback_url]):
                r = http_requests.get(try_url, headers=_IMG_DL_HEADERS, timeout=12, allow_redirects=True)
                if r.status_code == 200 and len(r.content) > 1024:
                    img_resp = r
                    break
            if not img_resp:
                continue
            content_type = img_resp.headers.get("Content-Type", "image/jpeg")
            ext = ".png" if "png" in content_type else ".jpg"
            filename = f"{uuid.uuid4()}{ext}"
            (UPLOAD_DIR / filename).write_bytes(img_resp.content)

            result = analyze_inspo_image(str(UPLOAD_DIR / filename))
            item = InspoItem(
                user_id=user_id,
                filename=filename,
                items_detected=json.dumps(result.get("items", [])),
                style_notes=result.get("style_notes", ""),
                source_url=canonical_url,
            )
            db.add(item)
            imported.append(item)
            existing_urls.add(canonical_url)  # prevent intra-batch dupes too
        except Exception:
            continue

    if not imported and skipped == 0:
        raise HTTPException(status_code=400, detail="Fetched the feed but couldn't download the pin images. Pinterest may be blocking the server — try again or upload screenshots manually.")
    if not imported and skipped > 0:
        raise HTTPException(status_code=400, detail=f"All {skipped} pins from this board are already in your inspo board.")

    db.commit()
    for item in imported:
        db.refresh(item)

    return {"imported": len(imported), "skipped": skipped, "items": [serialize_inspo(i) for i in imported]}


# ---------------------------------------------------------------------------
# Inspo — import from direct image URL (fallback for when Pinterest RSS fails)
# ---------------------------------------------------------------------------

class ImportFromUrlBody(BaseModel):
    image_url: str

@app.post("/api/inspo/import-url")
def import_inspo_from_url(
    body:    ImportFromUrlBody,
    user_id: int     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    url = body.image_url.strip()
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Please enter a valid image URL.")
    # Upgrade Pinterest CDN URLs
    if "pinimg.com" in url:
        url = _upgrade_pinterest_img_url(url)
    try:
        r = http_requests.get(url, headers=_IMG_DL_HEADERS, timeout=15, allow_redirects=True)
        if r.status_code != 200 or len(r.content) < 1024:
            raise HTTPException(status_code=400, detail="Could not download that image — make sure the URL is a direct image link.")
        content_type = r.headers.get("Content-Type", "image/jpeg")
        if not content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="That URL doesn't point to an image file.")
        ext = ".png" if "png" in content_type else ".jpg"
        filename = f"{uuid.uuid4()}{ext}"
        (UPLOAD_DIR / filename).write_bytes(r.content)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch image: {exc}")

    result = analyze_inspo_image(str(UPLOAD_DIR / filename))
    item = InspoItem(
        user_id=user_id,
        filename=filename,
        items_detected=json.dumps(result.get("items", [])),
        style_notes=result.get("style_notes", ""),
    )
    db.add(item); db.commit(); db.refresh(item)
    return serialize_inspo(item)


def _split_occasions(text: str) -> list[str]:
    """'brunch and dinner' → ['brunch', 'dinner']"""
    import re
    parts = re.split(r'\s*(?:and then|and|then|,|&)\s*', text, flags=re.IGNORECASE)
    return [p.strip() for p in parts if p.strip()]


@app.post("/api/outfit/week-plan")
def week_plan(body: WeekPlanBody, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Generate unique daily outfits for a Mon-Sun plan. Supports multiple events per day."""
    all_clothes = db.query(ClothingItem).filter(ClothingItem.user_id == user_id).all()
    if not all_clothes:
        raise HTTPException(status_code=400, detail="Your wardrobe is empty — upload some clothes first!")

    inspo_items   = db.query(InspoItem).filter(InspoItem.user_id == user_id).all()
    inspo_context = "; ".join(it.style_notes for it in inspo_items if it.style_notes)[:1500]

    bad_recs  = db.query(OutfitFeedback).filter(
        OutfitFeedback.user_id == user_id, OutfitFeedback.feedback == "bad"
    ).order_by(OutfitFeedback.created_at.desc()).limit(20).all()
    bad_combos = [json.loads(r.item_descs) for r in bad_recs if r.item_descs]

    style_boards = db.query(StyleBoard).filter(StyleBoard.user_id == user_id).all()
    style_vibes, disabled_rules = _get_user_settings(user_id, db)

    wardrobe_summary = [
        {"id": c.id, "type": c.type, "subtype": c.subtype, "color": c.color,
         "description": c.description, "formality": c.formality, "fit": c.fit, "season": c.season}
        for c in all_clothes
    ]

    weather = None
    if body.city or (body.lat is not None and body.lon is not None):
        try:
            weather = _resolve_weather(body.city, body.lat, body.lon)
        except Exception:
            pass
    if not weather:
        weather = {"temp_celsius": 18, "temp_fahrenheit": 64, "description": "mild", "city": ""}

    used_ids: list[int] = []
    results = []

    for day in body.days:
        if day.events:
            occasion_raw = ", ".join(day.events)
        elif day.occasion:
            occasion_raw = day.occasion
        else:
            results.append({
                "date": day.date, "day": day.day,
                "events": [], "occasion": None,
                "outfits": [], "needs_input": True,
            })
            continue

        sub_occasions = _split_occasions(occasion_raw)
        day_outfits = []

        for sub_occ in sub_occasions:
            board     = _find_matching_board(sub_occ, style_boards)
            b_rules   = board.rules if board else None
            b_inspo   = ""
            if board:
                b_items = db.query(InspoItem).filter(
                    InspoItem.user_id == user_id, InspoItem.style_board_id == board.id
                ).all()
                b_inspo = "; ".join(i.style_notes for i in b_items if i.style_notes)[:500]
            try:
                item_ids, reason = suggest_personalized_outfit(
                    wardrobe_items=wardrobe_summary,
                    inspo_context=inspo_context,
                    mood=body.mood or "ready for the day",
                    occasion=sub_occ,
                    weather=weather,
                    exclude_ids=used_ids,
                    bad_combos=bad_combos,
                    board_rules=b_rules,
                    board_inspo=b_inspo,
                    style_vibes=style_vibes,
                    disabled_rules=disabled_rules,
                )
                used_ids.extend(item_ids)
                id_order = {iid: idx for idx, iid in enumerate(item_ids)}
                selected = sorted(
                    [c for c in all_clothes if c.id in set(item_ids)],
                    key=lambda c: id_order.get(c.id, 999),
                )
                day_outfits.append({
                    "items": [serialize_clothing(c) for c in selected],
                    "reason": reason,
                    "occasion": sub_occ,
                })
            except Exception:
                pass

        results.append({
            "date": day.date, "day": day.day,
            "events": day.events, "occasion": occasion_raw,
            "outfits": day_outfits, "needs_input": False,
        })

    return {"week": results, "weather": weather}


# ---------------------------------------------------------------------------
# Serve built React frontend (must be last)
# ---------------------------------------------------------------------------
_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")
