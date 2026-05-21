import base64
import json
import os
from pathlib import Path

import anthropic
from dotenv import load_dotenv

load_dotenv()

_client = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set in environment")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def _encode_image(image_path: str) -> tuple[str, str]:
    """Return (base64_data, media_type) for the given image file."""
    ext = Path(image_path).suffix.lower().lstrip(".")
    media_type_map = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
        "gif": "image/gif",
    }
    media_type = media_type_map.get(ext, "image/jpeg")

    with open(image_path, "rb") as f:
        data = base64.standard_b64encode(f.read()).decode("utf-8")

    return data, media_type


def tag_clothing_image(image_path: str) -> dict:
    """
    Analyze a single clothing item photo and return a dict with:
    type, color, fit, formality, season, description
    """
    try:
        image_data, media_type = _encode_image(image_path)
        client = _get_client()

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                "Analyze this clothing item photo and return a JSON object with these exact fields:\n"
                                '- "type": one of [top, bottom, dress, outerwear, shoes, accessory, jumpsuit, skirt]\n'
                                '- "color": primary color(s) as a descriptive string (e.g. "navy blue", "cream and brown stripe")\n'
                                '- "fit": one of [loose, oversized, regular, fitted, bodycon]\n'
                                '- "formality": one of [casual, smart-casual, formal]\n'
                                '- "season": one of [all-season, spring-summer, fall-winter]\n'
                                '- "description": one sentence describing the item\n\n'
                                "Return ONLY valid JSON. No markdown, no explanation."
                            ),
                        },
                    ],
                }
            ],
        )

        raw = message.content[0].text.strip()
        # Strip accidental markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        return json.loads(raw)

    except (json.JSONDecodeError, KeyError, IndexError):
        # Return sensible defaults so the upload still succeeds
        return {
            "type": "top",
            "color": "unknown",
            "fit": "regular",
            "formality": "casual",
            "season": "all-season",
            "description": "Could not analyze this item automatically.",
        }
    except Exception as exc:
        raise RuntimeError(f"AI tagging failed: {exc}") from exc


def detect_all_items(image_path: str) -> list[dict]:
    """Detect every clothing item visible in a photo (e.g. a mirror selfie)."""
    try:
        image_data, media_type = _encode_image(image_path)
        client = _get_client()

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_data}},
                    {"type": "text", "text": (
                        "Analyze this fashion photo and identify ALL visible clothing items and accessories.\n"
                        "For each item return a JSON object with:\n"
                        '- "type": one of [top, bottom, dress, outerwear, shoes, accessory, jumpsuit, skirt]\n'
                        '- "color": color description\n'
                        '- "fit": one of [loose, oversized, regular, fitted, bodycon]\n'
                        '- "formality": one of [casual, smart-casual, formal]\n'
                        '- "season": one of [all-season, spring-summer, fall-winter]\n'
                        '- "description": one sentence description\n\n'
                        "Return a JSON ARRAY of all items found. Single item = single-element array.\n"
                        "Return ONLY valid JSON. No markdown, no explanation."
                    )},
                ],
            }],
        )

        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        result = json.loads(raw)
        if isinstance(result, dict):
            result = [result]
        return result

    except (json.JSONDecodeError, KeyError, IndexError):
        return [{
            "type": "top", "color": "unknown", "fit": "regular",
            "formality": "casual", "season": "all-season",
            "description": "Could not analyze automatically.",
        }]
    except Exception as exc:
        raise RuntimeError(f"AI detection failed: {exc}") from exc


def analyze_inspo_image(image_path: str) -> dict:
    """
    Analyze a fashion inspiration photo and return:
    {"items": [...], "style_notes": "..."}
    """
    try:
        image_data, media_type = _encode_image(image_path)
        client = _get_client()

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                "Analyze this fashion inspiration photo. Identify all visible clothing items.\n"
                                "Return a JSON object with:\n"
                                '- "items": array of objects, each with:\n'
                                '    - "type": clothing category (e.g. "wide-leg trousers", "oversized blazer", "slip dress", "chunky sneakers")\n'
                                '    - "color": color description\n'
                                '    - "description": brief description\n'
                                '- "style_notes": one sentence describing the overall aesthetic/vibe\n\n'
                                "Return ONLY valid JSON. No markdown, no explanation."
                            ),
                        },
                    ],
                }
            ],
        )

        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        result = json.loads(raw)

        # Normalise structure in case Claude varies the shape slightly
        if "items" not in result:
            result["items"] = []
        if "style_notes" not in result:
            result["style_notes"] = ""

        return result

    except (json.JSONDecodeError, KeyError, IndexError):
        return {"items": [], "style_notes": "Could not analyze image"}
    except Exception as exc:
        raise RuntimeError(f"AI inspo analysis failed: {exc}") from exc
