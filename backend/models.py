from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text
from database import Base


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    type = Column(String, nullable=False)       # top/bottom/dress/outerwear/shoes/accessory/jumpsuit/skirt
    color = Column(String, nullable=False)
    fit = Column(String, nullable=False)        # loose/oversized/regular/fitted/bodycon
    formality = Column(String, nullable=False)  # casual/smart-casual/formal
    season = Column(String, nullable=False)     # all-season/spring-summer/fall-winter
    subtype = Column(String, nullable=True)         # e.g. "crop top", "midi skirt", "ankle boots"
    description = Column(Text, nullable=False)
    user_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class InspoItem(Base):
    __tablename__ = "inspo_items"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    items_detected = Column(Text, nullable=True)   # JSON string: list of {type, description, color}
    style_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
