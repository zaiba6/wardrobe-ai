"""
Fashion rules injected into the outfit-suggestion prompt.

Sources:
  - r/femalefashionadvice wiki (dress codes, outfit formulas)
  - Classic "What Not to Wear" item rules
  - Business-casual HR guidelines
  - Stitch Fix occasion appropriateness logic
"""

# ---------------------------------------------------------------------------
# Occasion-specific hard rules
# ---------------------------------------------------------------------------

OCCASION_RULES: dict[str, str] = {
    "work": """
WORK / OFFICE rules (enforce strictly):
- Strapless, tube, or off-shoulder tops are NOT appropriate unless FULLY covered by a blazer or structured jacket that stays on
- Crop tops are NEVER work-appropriate (midriff must stay covered)
- Going-out tops (sequin, sheer, satin clubwear) and going-out dresses are NOT appropriate
- Bodycon dresses are NOT appropriate
- Mini skirts are only acceptable when paired with opaque tights AND a knee-length or longer blazer
- Shorts must be tailored/smart — no denim cutoffs, biker shorts, or athletic shorts
- Leggings are only acceptable if the top covers past the hips
- A blazer or structured cardigan IMMEDIATELY makes almost any look work-appropriate — prefer it when available
- Smart-casual or formal formality required; avoid purely casual items
""",

    "gym": """
GYM / WORKOUT rules:
- Select ONLY activewear: sports bra, athletic leggings, gym shorts, athletic top, track pants, yoga pants, sports jacket
- Do NOT include regular tops, jeans, dresses, skirts, or fashion outerwear
- Footwear must be sneakers or athletic shoes — no heels, sandals, loafers
""",

    "date night": """
DATE NIGHT rules:
- Strapless, off-shoulder, spaghetti-strap tops are great choices
- Slip dresses, bodycon dresses, mini dresses all work well
- Balance the look: if the top is revealing, keep the bottom more modest (and vice versa)
- Heels, ankle boots, or dressy flats preferred over chunky sneakers
- Avoid overly casual pieces (hoodies, sweatpants, gym wear)
""",

    "going out": """
GOING OUT / NIGHT OUT rules:
- Going-out tops, bodycon dresses, mini skirts, mini dresses are ideal
- Crop tops pair well with high-waisted bottoms
- Heels, ankle boots, platform shoes preferred
- Balance: if showing midriff, keep bottom high-waisted; if mini, consider a less revealing top
- Avoid overly casual or work-appropriate pieces
""",

    "wedding guest": """
WEDDING GUEST rules:
- Do NOT wear white, ivory, cream, or all-white prints (reserved for the bride)
- Midi or maxi dress preferred; mini is acceptable if venue is casual
- Smart-casual to formal only — no jeans, sneakers, hoodies, or casual tops
- Heels or dressy flats preferred
""",

    "weekend": """
WEEKEND / CASUAL rules:
- Almost anything goes — prioritise comfort and personal style
- Avoid overly formal pieces (business suits, cocktail dresses) unless the event calls for it
- Sneakers, loafers, sandals all fine
""",

    "brunch": """
BRUNCH rules:
- Smart-casual sweet spot — elevated casual
- Midi skirts, wide-leg trousers, blouses, and fitted tops work great
- Avoid gym wear, overly formal, or clubwear
- Sandals, loafers, ankle boots all work
""",
}

# ---------------------------------------------------------------------------
# General rules always injected regardless of occasion
# ---------------------------------------------------------------------------

GENERAL_RULES = """
GENERAL styling rules (always apply):
- A strapless, tube, or spaghetti-strap top REQUIRES a blazer, cardigan, or structured jacket for any smart-casual or formal setting
- A crop top is ONLY appropriate for casual or going-out — never work, formal, or brunch
- Bodycon fit is ONLY appropriate for going-out or date-night contexts
- Leggings worn as pants require a top that covers at least mid-thigh
- Shoes must match the formality of the outfit: heels/loafers with smart outfits; sneakers with casual; athletic shoes with gym only
- Going-out tops and going-out dresses are not appropriate for daytime, work, or casual daytime settings
- A blazer is the most versatile piece — it elevates any look and solves most "too casual" problems
- If the wardrobe has a blazer or cardigan available and the top is borderline (strapless, sleeveless), prefer adding the layer
- Do not combine gym/activewear pieces with non-activewear in the same outfit

RULE OF THREE (colour & accessories):
- An outfit should have no more than 3 distinct colours total (including shoes and bags)
- If the clothing items (top + bottom / dress) already feature 2 or more colours, accessories (bag, belt, jewellery, hat) must all be ONE cohesive colour — preferably a neutral (black, white, tan/nude, camel, grey) or a colour already present in the outfit
- If the outfit is monochromatic (one colour family throughout), a single statement accessory in a contrasting or complementary colour adds interest — but still only one accent colour
- Neutral colours (black, white, navy, grey, camel, tan, cream) do not count towards the 3-colour limit — they always work as accessories
- Metals count as neutrals: gold and silver accessories can be added freely, but do not mix gold and silver in the same outfit
- Prints count as 2 colours — pick accessories in one of the colours already in the print, not a third unrelated colour
- The goal: if the clothes are the statement, keep accessories quiet; if the clothes are simple, let one accessory shine
"""

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def get_rules_for_prompt(occasion: str | None) -> str:
    """Return the rules string to inject into the outfit prompt."""
    parts = [GENERAL_RULES]
    if occasion:
        key = occasion.lower().strip()
        # Fuzzy match occasion to a known key
        for k in OCCASION_RULES:
            if k in key or key in k:
                parts.append(OCCASION_RULES[k])
                break
    return "\n".join(parts)
