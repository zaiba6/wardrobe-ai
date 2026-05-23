import json
import os
import random
import re
import shutil
import uuid
import xml.etree.ElementTree as ET
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
from auth import (
    GOOGLE_AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
    GOOGLE_INFO_URL, GOOGLE_TOKEN_URL, REDIRECT_URI, APP_URL,
    create_access_token, get_current_user_id, get_optional_user_id,
    get_or_create_user,
)
from database import Base, engine, get_db
from models import ClothingItem, InspoItem, OutfitLog, User
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

SUBTYPES: dict[str, list[str]] = {
    "top":      ["tank top", "crop top", "t-shirt", "blouse", "going out top", "button-down", "sweater", "hoodie", "bodysuit", "corset top"],
    "bottom":   ["jeans", "trousers", "shorts", "leggings", "sweatpants", "cargo pants"],
    "skirt":    ["mini skirt", "midi skirt", "maxi skirt", "pleated skirt", "denim skirt", "slip skirt"],
    "dress":    ["mini dress", "midi dress", "maxi dress", "bodycon dress", "slip dress", "sundress", "going out dress", "wrap dress"],
    "outerwear":["leather jacket", "denim jacket", "blazer", "coat", "trench coat", "puffer jacket", "cardigan", "bomber jacket"],
    "shoes":    ["sneakers", "ankle boots", "boots", "knee-high boots", "heels", "sandals", "loafers", "flats", "platform shoes", "mules"],
    "accessory":["bag", "belt", "hat", "sunglasses", "jewelry", "scarf", "watch"],
    "jumpsuit": ["jumpsuit", "romper", "playsuit"],
}

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
        "scope":         "openid email profile",
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

    # Get Google user profile
    info_resp = http_requests.get(
        GOOGLE_INFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    info = info_resp.json()

    user  = get_or_create_user(db, info["id"], info["email"], info.get("name", ""), info.get("picture", ""))
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


# ---------------------------------------------------------------------------
# Outfit suggestion (mood-based)
# ---------------------------------------------------------------------------

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
    )[:2000]  # cap to avoid huge prompts

    wardrobe_summary = [
        {"id": c.id, "type": c.type, "subtype": c.subtype, "color": c.color,
         "description": c.description, "formality": c.formality, "fit": c.fit, "season": c.season}
        for c in all_clothes
    ]

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
        recs.append({"item_type": rt, "inspo_count": count, "owned_count": wardrobe_counts.get(mapped, 0),
                     "suggestion": f"You've saved {rt} {count} time{'s' if count != 1 else ''} — consider adding this to your wardrobe for a true capsule look."})
    recs.sort(key=lambda r: r["inspo_count"], reverse=True)
    return {"recommendations": recs, "total_inspo_items": len(inspo_items)}


# ---------------------------------------------------------------------------
# Pinterest board import
# ---------------------------------------------------------------------------

_PINTEREST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}

def _upgrade_pinterest_img_url(url: str) -> str:
    """Swap low-res Pinterest CDN paths to 736x for better AI analysis."""
    return re.sub(r'/\d+x/', '/736x/', url)

def _extract_images_from_rss(xml_bytes: bytes, max_pins: int) -> list[str]:
    ns = {"media": "http://search.yahoo.com/mrss/"}
    root = ET.fromstring(xml_bytes)
    urls: list[str] = []
    for item in root.findall(".//item"):
        if len(urls) >= max_pins:
            break
        # Try media:thumbnail first
        thumb = item.find("media:thumbnail", ns)
        if thumb is not None and thumb.get("url"):
            urls.append(_upgrade_pinterest_img_url(thumb.get("url")))
            continue
        # Fall back to <img src> inside <description>
        desc = item.findtext("description") or ""
        m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', desc)
        if m:
            urls.append(_upgrade_pinterest_img_url(m.group(1)))
    return urls


@app.post("/api/inspo/import-pinterest")
def import_pinterest_board(
    body:    PinterestImportBody,
    user_id: int     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    url = body.board_url.strip()
    if not url.startswith("http"):
        url = "https://" + url
    if "pinterest.com" not in url:
        raise HTTPException(status_code=400, detail="Please enter a valid Pinterest board URL.")

    rss_url = url.rstrip("/") + "/rss/"
    try:
        resp = http_requests.get(rss_url, headers=_PINTEREST_HEADERS, timeout=15)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach Pinterest — check your connection.")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Pinterest returned {resp.status_code}. Make sure the board is public and the URL is correct.",
        )

    try:
        img_urls = _extract_images_from_rss(resp.content, body.max_pins)
    except ET.ParseError:
        raise HTTPException(status_code=400, detail="Could not parse Pinterest feed. The board may be private.")

    if not img_urls:
        raise HTTPException(status_code=400, detail="No images found in this board. It may be empty or private.")

    imported: list[InspoItem] = []
    for img_url in img_urls:
        try:
            img_resp = http_requests.get(img_url, headers=_PINTEREST_HEADERS, timeout=10)
            if img_resp.status_code != 200:
                continue
            content_type = img_resp.headers.get("Content-Type", "image/jpeg")
            ext = ".jpg" if "jpeg" in content_type else ".png" if "png" in content_type else ".jpg"
            filename = f"{uuid.uuid4()}{ext}"
            (UPLOAD_DIR / filename).write_bytes(img_resp.content)

            result = analyze_inspo_image(str(UPLOAD_DIR / filename))
            item = InspoItem(
                user_id=user_id,
                filename=filename,
                items_detected=json.dumps(result.get("items", [])),
                style_notes=result.get("style_notes", ""),
            )
            db.add(item)
            imported.append(item)
        except Exception:
            continue

    if not imported:
        raise HTTPException(status_code=400, detail="Could not download any images from this board.")

    db.commit()
    for item in imported:
        db.refresh(item)

    return {"imported": len(imported), "items": [serialize_inspo(i) for i in imported]}


# ---------------------------------------------------------------------------
# Serve built React frontend (must be last)
# ---------------------------------------------------------------------------
_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")
