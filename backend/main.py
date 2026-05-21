import json
import os
import random
import shutil
import uuid
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ai import analyze_inspo_image, tag_clothing_image
from database import Base, engine, get_db
from models import ClothingItem, InspoItem
from weather import get_weather

load_dotenv()

Base.metadata.create_all(bind=engine)

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
    """Save an uploaded file to UPLOAD_DIR and return the generated filename."""
    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    if not ext:
        ext = ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    path = UPLOAD_DIR / filename
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return filename


def serialize_clothing(item: ClothingItem) -> dict:
    return {
        "id": item.id,
        "image_url": f"/uploads/{item.filename}",
        "type": item.type,
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


def _delete_upload_file(filename: str) -> None:
    """Delete a file from the uploads directory, silently if missing."""
    try:
        (UPLOAD_DIR / filename).unlink(missing_ok=True)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Pydantic request bodies
# ---------------------------------------------------------------------------

class ClothingUpdateBody(BaseModel):
    type: Optional[str] = None
    color: Optional[str] = None
    fit: Optional[str] = None
    formality: Optional[str] = None
    season: Optional[str] = None
    description: Optional[str] = None
    user_notes: Optional[str] = None


class OutfitSuggestBody(BaseModel):
    mood: str
    city: str


# ---------------------------------------------------------------------------
# Mood / fit / formality mappings
# ---------------------------------------------------------------------------

MOOD_FIT: dict[str, list[str]] = {
    "Comfy": ["loose", "oversized"],
    "Casual": ["loose", "oversized", "regular"],
    "Confident": ["fitted", "bodycon", "regular"],
    "Flowy": ["loose", "oversized"],
    "Put-together": ["regular", "fitted"],
}

MOOD_FORMALITY: dict[str, list[str]] = {
    "Comfy": ["casual"],
    "Casual": ["casual", "smart-casual"],
    "Confident": ["casual", "smart-casual", "formal"],
    "Flowy": ["casual", "smart-casual"],
    "Put-together": ["smart-casual", "formal"],
}

# Map broad inspo type keywords to wardrobe DB types
INSPO_TYPE_TO_WARDROBE: dict[str, str] = {
    "trouser": "bottom",
    "pant": "bottom",
    "jean": "bottom",
    "skirt": "skirt",
    "shorts": "bottom",
    "blazer": "outerwear",
    "jacket": "outerwear",
    "coat": "outerwear",
    "cardigan": "outerwear",
    "vest": "outerwear",
    "dress": "dress",
    "jumpsuit": "jumpsuit",
    "romper": "jumpsuit",
    "top": "top",
    "shirt": "top",
    "blouse": "top",
    "tee": "top",
    "sweater": "top",
    "hoodie": "top",
    "tank": "top",
    "sneaker": "shoes",
    "shoe": "shoes",
    "boot": "shoes",
    "heel": "shoes",
    "loafer": "shoes",
    "sandal": "shoes",
    "bag": "accessory",
    "hat": "accessory",
    "scarf": "accessory",
    "belt": "accessory",
    "jewel": "accessory",
    "necklace": "accessory",
    "earring": "accessory",
    "watch": "accessory",
    "sunglass": "accessory",
}


def _map_inspo_type_to_wardrobe(inspo_type: str) -> str:
    """Best-effort mapping of a free-text inspo clothing type to a wardrobe DB type."""
    lower = inspo_type.lower()
    for keyword, wardrobe_type in INSPO_TYPE_TO_WARDROBE.items():
        if keyword in lower:
            return wardrobe_type
    return "top"  # fallback


# ---------------------------------------------------------------------------
# Outfit suggestion logic
# ---------------------------------------------------------------------------

def _build_outfit(
    tops: list,
    bottoms: list,
    dresses: list,
    outerwear: list,
    shoes: list,
    mood: str,
    weather: dict,
    outfit_index: int,
) -> dict:
    """
    Build a single outfit suggestion dict.
    Returns {"items": [...serialized...], "reason": str} or None if not possible.
    """
    temp = weather["temp_celsius"]
    items = []

    # --- Main garment ---
    if mood == "Flowy" and dresses:
        main = random.choice(dresses)
        items.append(main)
    else:
        if not tops or not bottoms:
            return None
        # Rotate choice slightly between outfits using the index so we get variety
        top = tops[outfit_index % len(tops)]
        bottom = bottoms[outfit_index % len(bottoms)]
        items.append(top)
        items.append(bottom)

    # --- Outerwear ---
    if temp < 10 and outerwear:
        items.append(random.choice(outerwear))
    elif 10 <= temp < 18 and outerwear and random.random() > 0.5:
        items.append(random.choice(outerwear))

    # --- Shoes ---
    if shoes:
        items.append(random.choice(shoes))

    # --- Reason string ---
    temp_str = f"{temp}°C ({weather['temp_fahrenheit']}°F)"
    condition = weather["description"]
    if temp < 10:
        warmth_note = f"keeps you warm in {temp_str} {condition} weather"
    elif temp < 18:
        warmth_note = f"suits the mild {temp_str} {condition} weather"
    else:
        warmth_note = f"perfect for {temp_str} {condition} weather"

    mood_notes = {
        "Comfy": "relaxed and comfortable",
        "Casual": "effortlessly casual",
        "Confident": "bold and put-together",
        "Flowy": "soft, romantic, and effortless",
        "Put-together": "polished and smart",
    }
    vibe = mood_notes.get(mood, "stylish")

    reason = f"Feeling {vibe} — this outfit {warmth_note}."
    return {"items": [serialize_clothing(i) for i in items], "reason": reason}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---- Clothing ----

@app.post("/api/clothes/upload")
def upload_clothing(
    image: UploadFile = File(...),
    user_notes: str = Form(""),
    db: Session = Depends(get_db),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    filename = save_upload(image)
    image_path = str(UPLOAD_DIR / filename)

    try:
        tags = tag_clothing_image(image_path)
    except RuntimeError as exc:
        _delete_upload_file(filename)
        raise HTTPException(status_code=500, detail=str(exc))

    item = ClothingItem(
        filename=filename,
        type=tags.get("type", "top"),
        color=tags.get("color", "unknown"),
        fit=tags.get("fit", "regular"),
        formality=tags.get("formality", "casual"),
        season=tags.get("season", "all-season"),
        description=tags.get("description", ""),
        user_notes=user_notes or None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return serialize_clothing(item)


@app.get("/api/clothes")
def list_clothes(
    type: Optional[str] = None,
    fit: Optional[str] = None,
    formality: Optional[str] = None,
    season: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ClothingItem)
    if type:
        query = query.filter(ClothingItem.type == type)
    if fit:
        query = query.filter(ClothingItem.fit == fit)
    if formality:
        query = query.filter(ClothingItem.formality == formality)
    if season:
        query = query.filter(ClothingItem.season == season)

    items = query.order_by(ClothingItem.created_at.desc()).all()
    return [serialize_clothing(i) for i in items]


@app.put("/api/clothes/{item_id}")
def update_clothing(
    item_id: int,
    body: ClothingUpdateBody,
    db: Session = Depends(get_db),
):
    item = db.query(ClothingItem).filter(ClothingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    update_data = body.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return serialize_clothing(item)


@app.delete("/api/clothes/{item_id}")
def delete_clothing(item_id: int, db: Session = Depends(get_db)):
    item = db.query(ClothingItem).filter(ClothingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    _delete_upload_file(item.filename)
    db.delete(item)
    db.commit()
    return {"success": True}


# ---- Outfit Suggestion ----

@app.post("/api/outfit/suggest")
def suggest_outfit(body: OutfitSuggestBody, db: Session = Depends(get_db)):
    mood = body.mood
    city = body.city

    weather = get_weather(city)  # raises HTTPException on failure
    temp = weather["temp_celsius"]

    all_clothes = db.query(ClothingItem).all()
    if not all_clothes:
        return {
            "weather": weather,
            "mood": mood,
            "outfits": [
                {
                    "items": [],
                    "reason": (
                        "Your wardrobe is empty! Upload some clothing items "
                        "so I can suggest outfits for you."
                    ),
                }
            ],
        }

    preferred_fits = MOOD_FIT.get(mood, ["regular"])
    preferred_formalities = MOOD_FORMALITY.get(mood, ["casual"])

    # Season filter based on temperature
    if temp < 10:
        ok_seasons = {"fall-winter", "all-season"}
    elif temp <= 18:
        ok_seasons = {"fall-winter", "spring-summer", "all-season"}
    else:
        ok_seasons = {"spring-summer", "all-season"}

    def _matches(item: ClothingItem) -> bool:
        return (
            item.fit in preferred_fits
            and item.formality in preferred_formalities
            and item.season in ok_seasons
        )

    filtered = [c for c in all_clothes if _matches(c)]

    # Partition by type from filtered set; fall back to unfiltered for shoes/outerwear
    def _of_type(pool, t):
        return [c for c in pool if c.type == t]

    tops = _of_type(filtered, "top")
    bottoms = _of_type(filtered, "bottom") + _of_type(filtered, "skirt")
    dresses = _of_type(filtered, "dress") + _of_type(filtered, "jumpsuit")
    outerwear_filtered = _of_type(filtered, "outerwear")
    shoes_all = _of_type(all_clothes, "shoes")  # always use all shoes

    # If filtered outerwear is empty but we need warmth, try all outerwear
    outerwear = outerwear_filtered or (
        _of_type(all_clothes, "outerwear") if temp < 10 else []
    )

    # Check if we have anything at all to work with
    can_make_outfit = (tops and bottoms) or dresses
    if not can_make_outfit:
        # Give a helpful fallback message
        reason = (
            f"No perfect matches for your '{mood}' mood and "
            f"{temp}°C weather in your current wardrobe. "
            "Try uploading more items or adjusting filters!"
        )
        return {
            "weather": weather,
            "mood": mood,
            "outfits": [{"items": [], "reason": reason}],
        }

    # Shuffle pools so repeated calls give variety
    random.shuffle(tops)
    random.shuffle(bottoms)
    random.shuffle(dresses)

    outfits = []
    for i in range(3):
        outfit = _build_outfit(
            tops=tops,
            bottoms=bottoms,
            dresses=dresses,
            outerwear=outerwear,
            shoes=shoes_all,
            mood=mood,
            weather=weather,
            outfit_index=i,
        )
        if outfit and outfit["items"]:
            outfits.append(outfit)

    if not outfits:
        outfits = [
            {
                "items": [],
                "reason": (
                    "Couldn't build a complete outfit from your wardrobe right now. "
                    "Try adding more tops, bottoms, or dresses!"
                ),
            }
        ]

    return {"weather": weather, "mood": mood, "outfits": outfits}


# ---- Inspo ----

@app.post("/api/inspo/upload")
def upload_inspo(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    filename = save_upload(image)
    image_path = str(UPLOAD_DIR / filename)

    try:
        result = analyze_inspo_image(image_path)
    except RuntimeError as exc:
        _delete_upload_file(filename)
        raise HTTPException(status_code=500, detail=str(exc))

    item = InspoItem(
        filename=filename,
        items_detected=json.dumps(result.get("items", [])),
        style_notes=result.get("style_notes", ""),
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return serialize_inspo(item)


@app.get("/api/inspo")
def list_inspo(db: Session = Depends(get_db)):
    items = db.query(InspoItem).order_by(InspoItem.created_at.desc()).all()
    return [serialize_inspo(i) for i in items]


@app.delete("/api/inspo/{item_id}")
def delete_inspo(item_id: int, db: Session = Depends(get_db)):
    item = db.query(InspoItem).filter(InspoItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inspo item not found.")

    _delete_upload_file(item.filename)
    db.delete(item)
    db.commit()
    return {"success": True}


@app.get("/api/inspo/recommendations")
def inspo_recommendations(db: Session = Depends(get_db)):
    inspo_items = db.query(InspoItem).all()
    total_inspo = len(inspo_items)

    # Count occurrences of each raw type string across all inspo items
    type_counts: dict[str, int] = {}
    for inspo in inspo_items:
        detected = json.loads(inspo.items_detected or "[]")
        for detected_item in detected:
            raw_type = detected_item.get("type", "").strip().lower()
            if raw_type:
                type_counts[raw_type] = type_counts.get(raw_type, 0) + 1

    if not type_counts:
        return {"recommendations": [], "total_inspo_items": total_inspo}

    # Count owned items per wardrobe DB type
    all_clothes = db.query(ClothingItem).all()
    wardrobe_type_counts: dict[str, int] = {}
    for c in all_clothes:
        wardrobe_type_counts[c.type] = wardrobe_type_counts.get(c.type, 0) + 1

    recommendations = []
    for raw_type, count in type_counts.items():
        if count < 3:
            continue

        mapped = _map_inspo_type_to_wardrobe(raw_type)
        owned = wardrobe_type_counts.get(mapped, 0)

        suggestion = (
            f"You've saved {raw_type} {count} time{'s' if count != 1 else ''} — "
            f"consider adding this to your wardrobe for a true capsule look."
        )

        recommendations.append(
            {
                "item_type": raw_type,
                "inspo_count": count,
                "owned_count": owned,
                "suggestion": suggestion,
            }
        )

    # Sort by most-saved first
    recommendations.sort(key=lambda r: r["inspo_count"], reverse=True)

    return {"recommendations": recommendations, "total_inspo_items": total_inspo}


# Serve the built React frontend in production (must be last — catches all remaining routes)
_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")
