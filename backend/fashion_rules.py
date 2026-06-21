"""
Fashion rules injected into the outfit-suggestion prompt.
Each rule has a unique key so users can toggle them on/off in Settings.
"""

# ---------------------------------------------------------------------------
# Individual rule texts
# ---------------------------------------------------------------------------

_STRAPLESS_RULE = """STRAPLESS / STRAP RULE:
- A strapless, tube, or spaghetti-strap top REQUIRES a blazer, cardigan, or structured jacket for any smart-casual or formal setting
- A crop top is ONLY appropriate for casual or going-out — never work, formal, or brunch
- Going-out tops and going-out dresses are not appropriate for daytime, work, or casual daytime settings
- If a blazer or cardigan is available and the top is borderline (strapless, sleeveless), prefer adding the layer"""

_ONE_TOP_RULE = """ONE TOP RULE:
- An outfit may only contain ONE top (tank top, t-shirt, blouse, crop top, going-out top, bodysuit, etc.)
- A layer must be OUTERWEAR (blazer, jacket, cardigan, coat) — never a second top
- If you want to add a second top as a layer, use a blazer or cardigan from the wardrobe instead
- A dress is a COMPLETE outfit on its own — NEVER layer any shirt, blouse, or top underneath a dress. Only outerwear (jacket, blazer, cardigan, coat) may go over a dress."""

_FORMALITY_RULE = """OCCASION-FORMALITY MATCHING:
- For going-out / night-out: strongly prefer items with going-out top, going-out dress, bodycon, slip dress, mini skirt subtypes
- Assess the VIBE of each item from its description and colour — a sporty mini skirt is NOT the same as a dressy mini skirt
- For work: prefer formality=smart-casual or formal
- Bodycon fit is ONLY appropriate for going-out or date-night
- Shoes must match the formality: heels/loafers with smart outfits, sneakers with casual
- A blazer is the most versatile piece — it elevates any look and solves "too casual" problems"""

_RULE_OF_THREE = """RULE OF THREE (colour & accessories):
- No more than 3 distinct colours total (including shoes and bags)
- If the clothing already has 2+ colours, accessories must all be ONE cohesive colour — preferably a neutral or a colour already in the outfit
- Neutral colours (black, white, navy, grey, camel, tan, cream) do NOT count toward the 3-colour limit
- Metals count as neutrals: gold and silver accessories are free, but don't mix gold and silver in one outfit
- Prints count as 2 colours — pick accessories in one of the colours already in the print, not a third
- If the outfit is monochromatic, one statement accessory in a contrasting colour adds interest"""

_NO_ACTIVEWEAR_MIX = """ACTIVEWEAR SEPARATION:
- Never combine gym/activewear pieces (sports bra, athletic leggings, gym shorts, track pants) with regular non-activewear fashion pieces"""


# ---------------------------------------------------------------------------
# Occasion-specific rules
# ---------------------------------------------------------------------------

OCCASION_RULES: dict[str, str] = {
    "work": """WORK / OFFICE rules (enforce strictly):
- Strapless, tube, or off-shoulder tops are NOT appropriate unless fully covered by a blazer that stays on
- Crop tops are NEVER work-appropriate (midriff must stay covered)
- Going-out tops (sequin, sheer, satin clubwear) and going-out dresses are NOT appropriate
- Bodycon dresses are NOT appropriate
- Mini skirts are only acceptable when paired with opaque tights AND a knee-length or longer blazer
- Shorts must be tailored/smart — no denim cutoffs, biker shorts, or athletic shorts
- Leggings are only acceptable if the top covers past the hips
- A blazer or structured cardigan IMMEDIATELY makes almost any look work-appropriate — prefer it when available
- Smart-casual or formal formality required; avoid purely casual items""",

    "gym": """GYM / WORKOUT rules:
- Select ONLY activewear: sports bra, athletic leggings, gym shorts, athletic top, track pants, yoga pants, sports jacket
- Do NOT include regular tops, jeans, dresses, skirts, or fashion outerwear
- Footwear must be sneakers or athletic shoes — no heels, sandals, loafers""",

    "date night": """DATE NIGHT rules:
- Strapless, off-shoulder, spaghetti-strap tops are great choices
- Slip dresses, bodycon dresses, mini dresses all work well
- Balance the look: if the top is revealing, keep the bottom more modest (and vice versa)
- Heels, ankle boots, or dressy flats preferred over chunky sneakers
- Avoid overly casual pieces (hoodies, sweatpants, gym wear)""",

    "going out": """GOING OUT / NIGHT OUT rules:
- Going-out tops, bodycon dresses, mini skirts, mini dresses are ideal
- Crop tops pair well with high-waisted bottoms
- Heels, ankle boots, platform shoes preferred
- Balance: if showing midriff, keep the bottom high-waisted; if mini, consider a less revealing top
- Avoid overly casual or work-appropriate pieces""",

    "wedding guest": """WEDDING GUEST rules:
- Do NOT wear white, ivory, cream, or all-white prints (reserved for the bride)
- Midi or maxi dress preferred; mini is acceptable if venue is casual
- Smart-casual to formal only — no jeans, sneakers, hoodies, or casual tops
- Heels or dressy flats preferred""",

    "weekend": """WEEKEND / CASUAL rules:
- Almost anything goes — prioritise comfort and personal style
- Avoid overly formal pieces unless the event calls for it
- Sneakers, loafers, sandals all fine""",

    "brunch": """BRUNCH rules:
- Smart-casual sweet spot — elevated casual
- Midi skirts, wide-leg trousers, blouses, and fitted tops work great
- Avoid gym wear, overly formal pieces, or clubwear
- Sandals, loafers, ankle boots all work""",
}


# ---------------------------------------------------------------------------
# Named rule definitions (exposed to frontend for settings panel)
# ---------------------------------------------------------------------------

RULE_DEFINITIONS = [
    {
        "key": "rule_of_three",
        "label": "Rule of Three",
        "description": "Max 3 colors per outfit. Neutrals are always free. Accessories should unify the palette.",
    },
    {
        "key": "strapless_layer",
        "label": "Strapless needs a layer",
        "description": "Strapless or thin-strap tops need a blazer/cardigan for smart-casual or formal settings.",
    },
    {
        "key": "one_top",
        "label": "One top only",
        "description": "No wearing two tops at once — layers must be outerwear (blazer, jacket, cardigan).",
    },
    {
        "key": "formality_match",
        "label": "Occasion-formality matching",
        "description": "Match the outfit vibe to the occasion. No sporty pieces for a night out.",
    },
    {
        "key": "no_activewear_mix",
        "label": "No mixing gym & regular clothes",
        "description": "Never combine activewear (leggings, sports bra) with regular fashion pieces.",
    },
    {
        "key": "work_rules",
        "label": "Work dress code",
        "description": "No crop tops, bodycon, or going-out pieces for office occasions.",
    },
    {
        "key": "gym_rules",
        "label": "Gym = activewear only",
        "description": "For gym days, only select activewear items.",
    },
]

# Map rule key → text (for general rules)
_GENERAL_RULE_TEXTS = {
    "rule_of_three":    _RULE_OF_THREE,
    "strapless_layer":  _STRAPLESS_RULE,
    "one_top":          _ONE_TOP_RULE,
    "formality_match":  _FORMALITY_RULE,
    "no_activewear_mix": _NO_ACTIVEWEAR_MIX,
}

# Map occasion key → rule key (for occasion rules)
_OCCASION_RULE_KEY = {
    "work":  "work_rules",
    "gym":   "gym_rules",
}


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def get_rules_for_prompt(
    occasion: str | None,
    disabled_rules: list[str] | None = None,
) -> str:
    """Return the rules string to inject into the outfit prompt.
    Skips any rule whose key appears in disabled_rules."""
    disabled = set(disabled_rules or [])
    parts = []

    # General rules (ordered)
    for key in ["strapless_layer", "one_top", "formality_match", "rule_of_three", "no_activewear_mix"]:
        if key not in disabled:
            parts.append(_GENERAL_RULE_TEXTS[key])

    # Occasion rules
    if occasion:
        occ_lower = occasion.lower().strip()
        for k, text in OCCASION_RULES.items():
            if k in occ_lower or occ_lower in k:
                rule_key = _OCCASION_RULE_KEY.get(k, f"{k.replace(' ', '_')}_rules")
                if rule_key not in disabled:
                    parts.append(text)
                break

    return "\n\n".join(parts)
