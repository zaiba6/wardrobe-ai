from datetime import datetime

from sqlalchemy import Column, Float, Integer, String, DateTime, Text
from database import Base


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    google_id  = Column(String, unique=True, nullable=False, index=True)
    email      = Column(String, unique=True, nullable=False)
    name       = Column(String, nullable=False)
    picture    = Column(String, nullable=True)
    google_access_token  = Column(String, nullable=True)
    google_refresh_token = Column(String, nullable=True)
    google_token_expiry  = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, nullable=True, index=True)   # null = legacy / pre-auth
    filename    = Column(String, nullable=False)
    type        = Column(String, nullable=False)
    color       = Column(String, nullable=False)
    fit         = Column(String, nullable=False)
    formality   = Column(String, nullable=False)
    season      = Column(String, nullable=False)
    subtype     = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    user_notes  = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)


class InspoItem(Base):
    __tablename__ = "inspo_items"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, nullable=True, index=True)
    filename       = Column(String, nullable=False)
    items_detected = Column(Text, nullable=True)
    style_notes    = Column(Text, nullable=True)
    source_url     = Column(String, nullable=True, index=True)  # original Pinterest CDN URL
    style_board_id = Column(Integer, nullable=True)             # FK → style_boards.id
    created_at     = Column(DateTime, default=datetime.utcnow, nullable=False)


class StyleBoard(Base):
    __tablename__ = "style_boards"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, nullable=False, index=True)
    label      = Column(String, nullable=False)   # e.g. "Work", "Date Night" / "quiet luxury"
    rules      = Column(Text, nullable=True)      # free-text rules injected into AI prompt
    parent_id  = Column(Integer, nullable=True)   # null = event board; non-null = sub-vibe under that event
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class OutfitFeedback(Base):
    __tablename__ = "outfit_feedback"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, nullable=False, index=True)
    item_ids   = Column(Text, nullable=False)   # JSON list of clothing item IDs
    item_descs = Column(Text, nullable=True)    # JSON list of human-readable descriptions
    occasion   = Column(String, nullable=True)
    feedback   = Column(String, default="bad")  # "bad" or "loved"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class UserPreset(Base):
    __tablename__ = "user_presets"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, nullable=False, index=True)
    label      = Column(String, nullable=False)    # short display name e.g. "work"
    occasion   = Column(Text, nullable=False)      # full occasion text e.g. "office, smart casual..."
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class UserSettings(Base):
    __tablename__ = "user_settings"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, nullable=False, unique=True, index=True)
    style_vibes    = Column(Text, nullable=True)      # JSON array of aesthetic tags
    disabled_rules = Column(Text, nullable=True)      # JSON array of disabled rule keys
    updated_at     = Column(DateTime, default=datetime.utcnow, nullable=False)


class OutfitLog(Base):
    __tablename__ = "outfit_logs"

    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, nullable=False, index=True)
    items             = Column(Text, nullable=False)   # JSON: serialized clothing items snapshot
    mood              = Column(String, nullable=True)
    occasion          = Column(String, nullable=True)
    weather_city      = Column(String, nullable=True)
    weather_temp_c    = Column(Float, nullable=True)
    weather_condition = Column(String, nullable=True)
    worn_at           = Column(DateTime, default=datetime.utcnow, nullable=False)
