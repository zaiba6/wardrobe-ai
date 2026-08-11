import base64
import json
import os
import re
import time
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from taxonomy import normalize_clothing_tags
from fashion_rules import get_rules_for_prompt

load_dotenv()

# #region agent log
_DEBUG_LOG_PATH = "/Users/zaiba/Desktop/wardrobe-ai/.cursor/debug-66e2c0.log"
_MD_MARKERS_RE = re.compile(r"\*\*|(?:^|\n)\s*\d+\.\s|(?:^|\n)\s*-\s")


def _debug_log(entry: dict) -> None:
    try:
        entry.setdefault("sessionId", "66e2c0")
        entry.setdefault("timestamp", int(time.time() * 1000))
        with open(_DEBUG_LOG_PATH, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass
# #endregion

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
    """
    Return (base64_data, media_type) for Claude.
    Resizes to max 1280px in memory — reduces cost and latency without
    touching the stored original.
    """
    import io
    from PIL import Image

    img = Image.open(image_path)

    # Resize down if needed (Claude doesn't benefit from >1280px)
    max_dim = 1280
    w, h = img.size
    if max(w, h) > max_dim:
        ratio = max_dim / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    # Normalise to RGB JPEG (handles RGBA, palette, HEIC-converted etc.)
    if img.mode != "RGB":
        img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    data = base64.standard_b64encode(buf.getvalue()).decode("utf-8")

    return data, "image/jpeg"


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
                                '- "type": one of [top, bottom, dress, outerwear, shoes, accessory, jumpsuit, skirt, activewear]\n'
                                '- "subtype": specific subcategory, e.g. for top: [tank top, crop top, t-shirt, blouse, going out top, button-down, sweater, hoodie, bodysuit, corset top]; for bottom: [jeans, trousers, shorts, leggings, sweatpants, cargo pants]; for skirt: [mini skirt, midi skirt, maxi skirt, pleated skirt, denim skirt, slip skirt]; for dress: [mini dress, midi dress, maxi dress, bodycon dress, slip dress, sundress, going out dress, wrap dress]; for outerwear: [leather jacket, denim jacket, blazer, coat, trench coat, puffer jacket, cardigan, bomber jacket]; for shoes: [sneakers, ankle boots, boots, knee-high boots, heels, sandals, loafers, flats, platform shoes, mules]; for accessory: [bag, belt, hat, sunglasses, jewelry, scarf, watch]; for activewear: [sports bra, athletic leggings, gym shorts, athletic top, sports jacket, yoga pants, track pants, swimwear]\n'
                                '- "color": primary color(s) as a descriptive string (e.g. "navy blue", "cream and brown stripe")\n'
                                '- "fit": one of [loose, oversized, regular, fitted, bodycon]\n'
                                '- "formality": one of [casual, smart-casual, formal]\n'
                                '- "season": one of [all-season, spring-summer, fall-winter]\n'
                                '- "description": a short label max 5 words, e.g. "blue striped short-sleeve top"\n\n'
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

        return normalize_clothing_tags(json.loads(raw))

    except (json.JSONDecodeError, KeyError, IndexError):
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
                        "IMPORTANT: Only include wearable fashion items. Do NOT include phones, iPhones, electronics, mirrors, furniture, or any non-clothing objects.\n\n"
                        "For each item return a JSON object with:\n"
                        '- "type": one of [top, bottom, dress, outerwear, shoes, accessory, jumpsuit, skirt, activewear]\n'
                        '- "subtype": MUST use the most specific matching term:\n'
                        '    top → [tank top, crop top, t-shirt, blouse, going out top, button-down, sweater, hoodie, bodysuit, corset top]\n'
                        '    bottom → [jeans, trousers, shorts, leggings, sweatpants, cargo pants]\n'
                        '    skirt → [mini skirt, midi skirt, maxi skirt, pleated skirt, denim skirt, slip skirt]\n'
                        '    dress → [mini dress, midi dress, maxi dress, bodycon dress, slip dress, sundress, going out dress, wrap dress]\n'
                        '    outerwear → [leather jacket, denim jacket, blazer, coat, trench coat, puffer jacket, cardigan, bomber jacket]\n'
                        '    shoes → [sneakers, ankle boots, boots, knee-high boots, heels, sandals, loafers, flats, platform shoes, mules]\n'
                        '    accessory → [bag, belt, hat, sunglasses, jewelry, scarf, watch]\n'
                        '    jumpsuit → [jumpsuit, romper, playsuit]\n'
                        '    activewear → [sports bra, athletic leggings, gym shorts, athletic top, sports jacket, yoga pants, track pants, swimwear]\n'
                        "  KEY RULES: a sleeveless top with straps = 'tank top', never 'oversized shirt'. A short-length top = 'crop top'. "
                        "  Choose subtype by the garment's silhouette and cut, not just by how it fits the wearer.\n"
                        '- "color": color description\n'
                        '- "fit": one of [loose, oversized, regular, fitted, bodycon] — how it fits THE WEARER, not the garment style\n'
                        '- "formality": one of [casual, smart-casual, formal]\n'
                        '- "season": one of [all-season, spring-summer, fall-winter]\n'
                        '- "description": a short label max 5 words, e.g. "black high-waist straight jeans"\n\n'
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
        return [normalize_clothing_tags(item) for item in result]

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


def auto_categorize_inspo(inspo_items: list[dict]) -> dict:
    """
    Analyze inspo photos and group them into events → aesthetic sub-vibes.
    inspo_items: [{"id": int, "style_notes": str}, ...]
    Returns:
      {"events": [{"event": "Work", "vibes": [{"label": "quiet luxury", "ids": [1,2]}, ...]}, ...]}
    """
    if not inspo_items:
        return {"events": []}

    client = _get_client()

    items_text = "\n".join(
        f"Photo {item['id']}: {item['style_notes'] or 'no description'}"
        for item in inspo_items
    )

    prompt = (
        "You are a fashion stylist organizing a client's inspiration photos into a two-level system.\n\n"
        f"Photo descriptions:\n{items_text}\n\n"
        "STEP 1 — GROUP BY LIFE EVENT: Assign every photo to one of these events (or create a new one if needed): "
        "Work, Date Night, Going Out, Gym, Brunch, Weekend, Travel, Casual.\n"
        "Only create an event that at least 1 photo genuinely fits. If all photos share one event, use one event.\n\n"
        "STEP 2 — AESTHETIC SUB-VIBES: Within each event, group photos by aesthetic sub-vibe "
        "(e.g. quiet luxury, business casual, romantic, edgy, streetwear, boho, minimalist, y2k, coastal, preppy, dark academia, cozy).\n"
        "Each event needs 1-3 sub-vibes. Every photo must appear in exactly one sub-vibe.\n\n"
        'Return JSON: {"events": [{"event": "Work", "vibes": [{"label": "quiet luxury", "ids": [1, 3]}, {"label": "business casual", "ids": [2]}]}, ...]}\n'
        "Return ONLY valid JSON. No markdown."
    )

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    result = json.loads(raw)
    return result if "events" in result else {"events": []}


def suggest_personalized_outfit(
    wardrobe_items: list[dict],
    inspo_context: str,
    mood: str,
    occasion: str | None,
    weather: dict,
    exclude_ids: list[int] | None = None,
    bad_combos: list[list[str]] | None = None,
    board_rules: str | None = None,
    board_inspo: str | None = None,
    style_vibes: list[str] | None = None,
    disabled_rules: list[str] | None = None,
    wardrobe_taste: str | None = None,
) -> tuple[list[int], str]:
    """Pick one outfit using Claude, informed by the user's inspo aesthetic and mood."""
    if not wardrobe_items:
        return [], "Your wardrobe is empty — upload some pieces first!"

    client = _get_client()
    excluded = set(exclude_ids or [])
    available = [item for item in wardrobe_items if item["id"] not in excluded] or wardrobe_items

    wardrobe_text = "\n".join(
        f"ID {item['id']}: {item['color']} {item.get('subtype') or item['type']} "
        f"({item['formality']}, {item['fit']}, {item['season']}) — {item['description']}"
        for item in available
    )

    temp_c    = weather["temp_celsius"]
    temp_f    = weather["temp_fahrenheit"]
    condition = weather["description"]

    inspo_line    = f"User's personal style from their inspo board:\n{inspo_context}\n\n" if inspo_context else ""
    taste_line    = f"{wardrobe_taste}\n\n" if wardrobe_taste else ""
    occasion_line = f"Occasion: {occasion}.\n" if occasion else ""
    vibe_line     = f"User's personal aesthetic/style identity: {', '.join(style_vibes)}.\n" if style_vibes else ""
    board_section = ""
    if board_rules:
        board_section += f"PERSONAL STYLE RULES FOR THIS OCCASION (set by the user — follow strictly):\n{board_rules}\n\n"
    if board_inspo:
        board_section += f"PERSONAL INSPO AESTHETIC FOR THIS OCCASION:\n{board_inspo}\n\n"

    rules = get_rules_for_prompt(occasion, disabled_rules)

    # Mood-specific overrides injected directly into the prompt
    mood_overrides = ""
    if mood and "comfy" in mood.lower():
        mood_overrides = "MOOD OVERRIDE (comfy selected): Do NOT suggest heels of any kind — flats, sneakers, loafers, or sandals only.\n\n"

    bad_combos_line = ""
    if bad_combos:
        formatted = "\n".join(f"  - {', '.join(combo)}" for combo in bad_combos[:15])
        bad_combos_line = (
            "The user has previously rejected these outfit combinations — do NOT recreate them:\n"
            f"{formatted}\n\n"
        )

    prompt = (
        "You are a personal stylist who knows this user's taste.\n\n"
        f"{inspo_line}"
        f"{taste_line}"
        f"{vibe_line}"
        f"How they're feeling today: {mood}.\n"
        f"{occasion_line}"
        f"Current weather: {temp_c}°C ({temp_f}°F), {condition}.\n\n"
        f"{mood_overrides}"
        f"{bad_combos_line}"
        f"{board_section}"
        f"{rules}\n\n"
        "Additional styling guidance:\n"
        "- Match the inspo aesthetic as closely as possible using what they own.\n"
        "- Take the mood literally: 'bloated', 'uncomfortable', 'tired' → loose, oversized, flowy fits. "
        "'Confident', 'sexy', 'powerful' → fitted, bodycon. 'Cozy', 'comfy' → soft, relaxed.\n"
        "- Weather: below 15°C → include outerwear. 15–20°C → skip outerwear but tell them to bring a light layer for later in the reason. Above 20°C → no outerwear.\n"
        "- Always include top + bottom OR dress/jumpsuit. Add shoes if available. Add an accessory if it completes the look.\n"
        "- If the occasion rules say a top needs a layer (blazer/cardigan), you MUST include one from the wardrobe — if none is available, pick a different top.\n"
        "- Do NOT repeat any item IDs from a previous outfit the user already saw.\n\n"
        f"Wardrobe (only pick from these):\n{wardrobe_text}\n\n"
        "Return JSON with:\n"
        '- "item_ids": array of integer IDs\n'
        '- "reason": 1–2 warm, friendly sentences — why this matches their vibe and mood. '
        "If the outfit needed a layer due to occasion rules, mention it naturally. "
        "If 15–20°C, add a note to bring a light layer for the evening.\n"
        "Return ONLY valid JSON. No markdown."
    )

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    result    = json.loads(raw)
    item_ids  = [int(i) for i in result.get("item_ids", [])]
    reason    = result.get("reason", "Here's a look for you!")
    return item_ids, reason


def suggest_vibe_outfit(
    wardrobe_items: list[dict],
    vibe: str,
    weather: dict,
    mood: str | None = None,
    style_vibes: list[str] | None = None,
    disabled_rules: list[str] | None = None,
) -> tuple[list[int], str]:
    """Ask Claude to pick specific wardrobe item IDs for a vibe + weather."""
    if not wardrobe_items:
        return [], "Your wardrobe is empty — upload some pieces first!"

    client = _get_client()

    wardrobe_text = "\n".join(
        f"ID {item['id']}: {item['color']} {item.get('subtype') or item['type']} "
        f"({item['formality']}, {item['fit']}, {item['season']}) — {item['description']}"
        for item in wardrobe_items
    )

    temp_c = weather["temp_celsius"]
    temp_f = weather["temp_fahrenheit"]
    condition = weather["description"]
    mood_line  = f"Mood: {mood}.\n" if mood else ""
    vibe_line2 = f"User's personal aesthetic: {', '.join(style_vibes)}.\n" if style_vibes else ""

    rules = get_rules_for_prompt(vibe, disabled_rules)

    prompt = (
        f'You are a personal stylist. Create an outfit for: "{vibe}".\n'
        f"Weather: {temp_c}°C ({temp_f}°F), {condition}.\n"
        f"{mood_line}"
        f"{vibe_line2}\n"
        f"{rules}\n\n"
        f"Wardrobe:\n{wardrobe_text}\n\n"
        "Pick a complete, weather-appropriate outfit. Include a top + bottom OR a dress/jumpsuit. "
        "Add outerwear if temp < 18°C. Add shoes and/or an accessory if available.\n"
        "Respect the fashion rules above — e.g. for work vibes, no strapless unless layered.\n"
        "Return JSON with:\n"
        '- "item_ids": array of integer item IDs (only IDs from the list above)\n'
        '- "reason": one friendly sentence explaining this outfit for the vibe and weather\n'
        "Return ONLY valid JSON. No markdown."
    )

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    result = json.loads(raw)
    item_ids = [int(i) for i in result.get("item_ids", [])]
    reason = result.get("reason", "Here's a great outfit for you!")
    return item_ids, reason


def _strip_json_fence(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    return text


def stylist_chat(
    history: list[dict],
    wardrobe_items: list[dict],
    weather: dict | None = None,
    inspo_context: str = "",
    style_vibes: list[str] | None = None,
    wardrobe_taste: str | None = None,
) -> dict:
    """
    Multi-turn closet stylist. Asks clarifying questions, then recommends
    outfits or packing lists using ONLY the user's wardrobe item IDs.

    history: [{role: "user"|"assistant", content: str}, ...] — latest user
    message should already be the last entry.
    """
    if not wardrobe_items:
        return {
            "reply": "Your closet is empty — add a few pieces first and I can help you pack or get dressed.",
            "mode": "ask",
            "follow_ups": ["take me to my closet"],
            "weather_city": None,
            "outfits": [],
            "packing_lists": [],
        }

    client = _get_client()

    wardrobe_text = "\n".join(
        f"ID {item['id']}: {item['color']} {item.get('subtype') or item['type']} "
        f"({item['formality']}, {item['fit']}, {item['season']}) — {item['description']}"
        for item in wardrobe_items
    )

    weather_block = "Weather: not fetched yet.\n"
    if weather:
        weather_block = (
            f"Weather for {weather.get('city', 'the location')}: "
            f"{weather['temp_celsius']}°C ({weather['temp_fahrenheit']}°F), "
            f"{weather.get('description') or weather.get('condition')}.\n"
        )

    inspo_line = f"Inspo / taste notes:\n{inspo_context}\n\n" if inspo_context else ""
    taste_line = f"{wardrobe_taste}\n\n" if wardrobe_taste else ""
    vibe_line = f"Aesthetic identity: {', '.join(style_vibes)}.\n" if style_vibes else ""

    system = (
        "You are the in-app stylist for \"wait what do i wear?\" — warm, concise, slightly witty, "
        "never corporate. You ONLY recommend pieces from the user's closet (IDs below).\n\n"
        "GOALS you handle:\n"
        "1) PACKING — trip for N days. Ask smart clarifying questions BEFORE listing a pack "
        "(location/city, dates or # of days, forecast if unknown, activities, dress codes, "
        "laundry access, suitcase limit / how many pieces allowed, shoes limit, must-bring items).\n"
        "2) OUTFIT — one occasion (\"the Lavel in Toronto for a drink tonight\"). Infer vibe from "
        "venue/occasion language. Ask only what's missing (city if unknown, formality, comfort).\n"
        "3) GENERAL style questions using their closet.\n\n"
        "RULES:\n"
        "- Prefer asking 1–2 focused questions at a time over a long questionnaire.\n"
        "- When you know enough, recommend. For packing: group by day and/or essentials; "
        "reuse pieces across days when realistic; respect max item counts the user sets.\n"
        "- Always include shoes when recommending a wearable look if shoes exist in the closet.\n"
        "- Weather: cold (<15°C) → outerwear; mild evening plans → suggest a light layer in notes.\n"
        "- If the user names a city and weather isn't provided yet, set weather_city to that city "
        "(plain city name, e.g. \"Toronto\") so the app can fetch weather. Don't invent temps.\n"
        "- item_ids MUST be integers from the wardrobe list. Never invent IDs.\n"
        "- Keep reply to 2–5 short sentences. Put the outfit/pack details in structured fields.\n\n"
        f"{weather_block}"
        f"{inspo_line}"
        f"{taste_line}"
        f"{vibe_line}"
        f"Wardrobe:\n{wardrobe_text}\n\n"
        "Respond with ONLY valid JSON (no markdown):\n"
        "{\n"
        '  "reply": "string spoken to the user",\n'
        '  "mode": "ask" | "outfit" | "pack",\n'
        '  "follow_ups": ["short chip the user can tap", "..."],\n'
        '  "weather_city": "City name or null",\n'
        '  "outfits": [{"label": "Tonight", "item_ids": [1,2], "reason": "why"}],\n'
        '  "packing_lists": [{"label": "Day 1 / Essentials", "item_ids": [1,2], "notes": "optional"}]\n'
        "}\n"
        "Use empty arrays when not recommending yet. follow_ups: 0–4 short phrases."
    )

    # Build Claude messages: system as first user preamble is less ideal than system param;
    # Anthropic supports system=. Keep history as alternating user/assistant.
    claude_messages = []
    for msg in history[-16:]:
        role = msg.get("role")
        content = (msg.get("content") or "").strip()
        if role not in ("user", "assistant") or not content:
            continue
        claude_messages.append({"role": role, "content": content})

    if not claude_messages or claude_messages[-1]["role"] != "user":
        return {
            "reply": "Tell me what you're dressing for — a trip, a night out, anything.",
            "mode": "ask",
            "follow_ups": [
                "packing for a trip",
                "what should I wear tonight?",
            ],
            "weather_city": None,
            "outfits": [],
            "packing_lists": [],
        }

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=900,
        system=system,
        messages=claude_messages,
    )

    raw_text = message.content[0].text
    raw = _strip_json_fence(raw_text)
    # #region agent log
    _debug_log({
        "hypothesisId": "H2/H3", "location": "ai.py:stylist_chat:pre-parse",
        "message": "raw claude output before json.loads",
        "data": {
            "starts_with_fence": raw_text.strip().startswith("```"),
            "contains_fence_later": "```" in raw_text.strip()[3:] if len(raw_text.strip()) > 3 else False,
            "raw_head": raw[:400],
            "raw_len": len(raw),
        },
    })
    # #endregion
    try:
        result = json.loads(raw)
        # #region agent log
        _debug_log({
            "hypothesisId": "H2", "location": "ai.py:stylist_chat:parse-ok",
            "message": "json parse succeeded", "data": {"keys": list(result.keys())},
        })
        # #endregion
    except json.JSONDecodeError as e:
        # #region agent log
        _debug_log({
            "hypothesisId": "H2/H3", "location": "ai.py:stylist_chat:parse-fail",
            "message": "json parse FAILED — falling back to raw text as reply",
            "data": {"error": str(e), "raw_head": raw[:600]},
        })
        # #endregion
        return {
            "reply": raw[:500] if raw else "I blanked for a second — try that again?",
            "mode": "ask",
            "follow_ups": [],
            "weather_city": None,
            "outfits": [],
            "packing_lists": [],
        }

    valid_ids = {int(item["id"]) for item in wardrobe_items}

    def _clean_picks(rows, id_key="item_ids"):
        cleaned = []
        for row in rows or []:
            if not isinstance(row, dict):
                continue
            ids = []
            for i in row.get(id_key) or []:
                try:
                    iid = int(i)
                except (TypeError, ValueError):
                    continue
                if iid in valid_ids:
                    ids.append(iid)
            if not ids:
                continue
            cleaned.append({
                "label": row.get("label") or "Look",
                "item_ids": ids,
                "reason": row.get("reason") or row.get("notes") or "",
                "notes": row.get("notes") or "",
            })
        return cleaned

    mode = result.get("mode") or "ask"
    if mode not in ("ask", "outfit", "pack"):
        mode = "ask"

    follow_ups = result.get("follow_ups") or []
    if not isinstance(follow_ups, list):
        follow_ups = []
    follow_ups = [str(x).strip() for x in follow_ups if str(x).strip()][:4]

    weather_city = result.get("weather_city")
    if weather_city is not None:
        weather_city = str(weather_city).strip() or None

    reply_text = str(result.get("reply") or "Here's what I'm thinking.").strip()
    # #region agent log
    _debug_log({
        "hypothesisId": "H1", "location": "ai.py:stylist_chat:reply-check",
        "message": "checking reply for unrendered markdown",
        "data": {"has_markdown_markers": bool(_MD_MARKERS_RE.search(reply_text)), "reply_head": reply_text[:300]},
    })
    # #endregion

    return {
        "reply": reply_text,
        "mode": mode,
        "follow_ups": follow_ups,
        "weather_city": weather_city,
        "outfits": _clean_picks(result.get("outfits")),
        "packing_lists": _clean_picks(result.get("packing_lists")),
    }
