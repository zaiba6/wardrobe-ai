"""
Fashion taxonomy — 3-layer classification pipeline.

Layer 1 (Claude vision) produces raw tags.
Layer 2 (this file, SUBTYPE_ALIASES) maps synonyms/variations to canonical terms,
         drawing from DeepFashion and iMaterialist naming conventions.
Layer 3 (VALID_SUBTYPES) is our master list — final validation and fallback.
"""

# ---------------------------------------------------------------------------
# Master taxonomy (single source of truth — imported by main.py and ai.py)
# ---------------------------------------------------------------------------

VALID_TYPES = ["top", "bottom", "dress", "outerwear", "shoes", "accessory", "jumpsuit", "skirt"]

VALID_SUBTYPES: dict[str, list[str]] = {
    "top":       ["tank top", "crop top", "t-shirt", "blouse", "going out top",
                  "button-down", "sweater", "hoodie", "bodysuit", "corset top"],
    "bottom":    ["jeans", "trousers", "shorts", "leggings", "sweatpants", "cargo pants"],
    "skirt":     ["mini skirt", "midi skirt", "maxi skirt", "pleated skirt", "denim skirt", "slip skirt"],
    "dress":     ["mini dress", "midi dress", "maxi dress", "bodycon dress", "slip dress",
                  "sundress", "going out dress", "wrap dress"],
    "outerwear": ["leather jacket", "denim jacket", "blazer", "coat", "trench coat",
                  "puffer jacket", "cardigan", "bomber jacket"],
    "shoes":     ["sneakers", "ankle boots", "boots", "knee-high boots", "heels",
                  "sandals", "loafers", "flats", "platform shoes", "mules"],
    "accessory": ["bag", "belt", "hat", "sunglasses", "jewelry", "scarf", "watch"],
    "jumpsuit":  ["jumpsuit", "romper", "playsuit"],
}

# ---------------------------------------------------------------------------
# Layer 2 — synonym / alias maps (DeepFashion + iMaterialist inspired)
# ---------------------------------------------------------------------------

# Raw type names Claude might return → our canonical type
TYPE_ALIASES: dict[str, str] = {
    "pants":           "bottom",
    "trousers":        "bottom",
    "slacks":          "bottom",
    "denim":           "bottom",
    "skirt":           "skirt",
    "jacket":          "outerwear",
    "coat":            "outerwear",
    "cardigan":        "outerwear",
    "blazer":          "outerwear",
    "vest":            "outerwear",
    "shoe":            "shoes",
    "sneaker":         "shoes",
    "boot":            "shoes",
    "heel":            "shoes",
    "sandal":          "shoes",
    "purse":           "accessory",
    "handbag":         "accessory",
    "bag":             "accessory",
    "romper":          "jumpsuit",
    "playsuit":        "jumpsuit",
    "overalls":        "jumpsuit",
}

# Raw subtype / description → canonical subtype
# Covers DeepFashion fine-grained categories + common consumer names
SUBTYPE_ALIASES: dict[str, str] = {
    # ── tops ──────────────────────────────────────────────────────────────
    "cami":                      "tank top",
    "camisole":                  "tank top",
    "spaghetti strap top":       "tank top",
    "spaghetti strap":           "tank top",
    "sleeveless shirt":          "tank top",
    "sleeveless top":            "tank top",
    "muscle tee":                "tank top",
    "muscle tank":               "tank top",
    "ribbed tank":               "tank top",

    "crop":                      "crop top",
    "cropped tee":               "crop top",
    "cropped shirt":             "crop top",
    "cropped top":               "crop top",
    "bralette top":              "crop top",
    "bralette":                  "crop top",

    "tee":                       "t-shirt",
    "graphic tee":               "t-shirt",
    "graphic shirt":             "t-shirt",
    "jersey":                    "t-shirt",
    "polo":                      "t-shirt",
    "polo shirt":                "t-shirt",
    "short sleeve top":          "t-shirt",

    "puff sleeve top":           "blouse",
    "puff sleeve blouse":        "blouse",
    "ruffle top":                "blouse",
    "flowy top":                 "blouse",
    "chiffon top":               "blouse",
    "wrap top":                  "blouse",
    "lace top":                  "blouse",

    "party top":                 "going out top",
    "clubwear top":              "going out top",
    "sequin top":                "going out top",
    "satin top":                 "going out top",
    "glitter top":               "going out top",
    "tube top":                  "going out top",

    "shirt":                     "button-down",
    "oxford shirt":              "button-down",
    "flannel shirt":             "button-down",
    "chambray shirt":            "button-down",
    "linen shirt":               "button-down",
    "dress shirt":               "button-down",

    "pullover":                  "sweater",
    "knitwear":                  "sweater",
    "knit top":                  "sweater",
    "turtleneck":                "sweater",
    "crewneck":                  "sweater",
    "crewneck sweatshirt":       "sweater",
    "sweatshirt":                "sweater",
    "ribbed sweater":            "sweater",
    "oversized sweater":         "sweater",

    "hooded sweatshirt":         "hoodie",
    "zip up hoodie":             "hoodie",
    "zip hoodie":                "hoodie",
    "zip-up":                    "hoodie",

    # ── bottoms ───────────────────────────────────────────────────────────
    "skinny jeans":              "jeans",
    "straight jeans":            "jeans",
    "straight leg jeans":        "jeans",
    "wide leg jeans":            "jeans",
    "wide-leg jeans":            "jeans",
    "barrel jeans":              "jeans",
    "barrel leg jeans":          "jeans",
    "flare jeans":               "jeans",
    "bootcut jeans":             "jeans",
    "mom jeans":                 "jeans",
    "boyfriend jeans":           "jeans",
    "slim jeans":                "jeans",
    "slim fit jeans":            "jeans",
    "denim pants":               "jeans",
    "denim trousers":            "jeans",

    "wide leg trouser":          "trousers",
    "wide-leg trouser":          "trousers",
    "wide leg trousers":         "trousers",
    "palazzo":                   "trousers",
    "palazzo pants":             "trousers",
    "wide leg pants":            "trousers",
    "dress pants":               "trousers",
    "slacks":                    "trousers",
    "chinos":                    "trousers",
    "chino pants":               "trousers",
    "tailored trousers":         "trousers",
    "linen pants":               "trousers",
    "linen trousers":            "trousers",

    "yoga pants":                "leggings",
    "tights":                    "leggings",
    "athletic leggings":         "leggings",
    "biker shorts":              "shorts",
    "cycling shorts":            "shorts",
    "bermuda shorts":            "shorts",
    "denim shorts":              "shorts",

    # ── skirts ────────────────────────────────────────────────────────────
    "micro skirt":               "mini skirt",
    "short skirt":               "mini skirt",
    "mini":                      "mini skirt",

    "tea length skirt":          "midi skirt",
    "midi":                      "midi skirt",

    "floor length skirt":        "maxi skirt",
    "long skirt":                "maxi skirt",
    "maxi":                      "maxi skirt",

    "satin skirt":               "slip skirt",
    "bias skirt":                "slip skirt",
    "bias cut skirt":            "slip skirt",

    # ── dresses ───────────────────────────────────────────────────────────
    "short dress":               "mini dress",
    "micro dress":               "mini dress",

    "tea length dress":          "midi dress",

    "floor length dress":        "maxi dress",
    "long dress":                "maxi dress",

    "tight dress":               "bodycon dress",
    "fitted dress":              "bodycon dress",
    "tube dress":                "bodycon dress",
    "bandage dress":             "bodycon dress",

    "satin dress":               "slip dress",
    "bias cut dress":            "slip dress",
    "bias dress":                "slip dress",

    "club dress":                "going out dress",
    "cocktail dress":            "going out dress",
    "party dress":               "going out dress",
    "sequin dress":              "going out dress",

    "faux wrap dress":           "wrap dress",

    "summer dress":              "sundress",
    "floral dress":              "sundress",
    "smock dress":               "sundress",
    "cotton dress":              "sundress",

    # ── outerwear ─────────────────────────────────────────────────────────
    "moto jacket":               "leather jacket",
    "biker jacket":              "leather jacket",
    "faux leather jacket":       "leather jacket",

    "jean jacket":               "denim jacket",
    "denim trucker":             "denim jacket",

    "overcoat":                  "coat",
    "wool coat":                 "coat",
    "peacoat":                   "coat",
    "pea coat":                  "coat",
    "topcoat":                   "coat",
    "cape":                      "coat",

    "trench":                    "trench coat",
    "raincoat":                  "trench coat",

    "puffer":                    "puffer jacket",
    "down jacket":               "puffer jacket",
    "down coat":                 "puffer jacket",
    "quilted jacket":            "puffer jacket",
    "padded jacket":             "puffer jacket",

    "knit cardigan":             "cardigan",
    "open front sweater":        "cardigan",
    "open knit cardigan":        "cardigan",

    "bomber":                    "bomber jacket",
    "varsity jacket":            "bomber jacket",
    "satin bomber":              "bomber jacket",

    # ── shoes ─────────────────────────────────────────────────────────────
    "trainers":                  "sneakers",
    "athletic shoes":            "sneakers",
    "running shoes":             "sneakers",
    "tennis shoes":              "sneakers",
    "high tops":                 "sneakers",
    "hi-tops":                   "sneakers",
    "hi tops":                   "sneakers",

    "booties":                   "ankle boots",
    "ankle bootie":              "ankle boots",
    "chelsea boots":             "ankle boots",
    "chelsea":                   "ankle boots",

    "combat boots":              "boots",
    "work boots":                "boots",
    "lug sole boots":            "boots",

    "stilettos":                 "heels",
    "stiletto":                  "heels",
    "pumps":                     "heels",
    "block heels":               "heels",
    "block heel":                "heels",
    "kitten heels":              "heels",
    "kitten heel":               "heels",
    "wedge heels":               "heels",
    "wedge":                     "heels",
    "wedge sandals":             "heels",
    "strappy heels":             "heels",

    "flip flops":                "sandals",
    "slides":                    "sandals",
    "slide sandals":             "sandals",
    "strappy sandals":           "sandals",
    "gladiator sandals":         "sandals",
    "gladiators":                "sandals",
    "birkenstock":               "sandals",

    "penny loafers":             "loafers",
    "horsebit loafers":          "loafers",
    "slip-on loafers":           "loafers",

    "ballet flats":              "flats",
    "pointed toe flats":         "flats",
    "d'orsay flats":             "flats",

    "backless mule":             "mules",
    "slip-on mule":              "mules",
    "kitten heel mules":         "mules",

    "platform sneakers":         "platform shoes",
    "platform boots":            "platform shoes",
    "chunky shoes":              "platform shoes",

    # ── accessories ───────────────────────────────────────────────────────
    "purse":                     "bag",
    "handbag":                   "bag",
    "tote":                      "bag",
    "tote bag":                  "bag",
    "crossbody":                 "bag",
    "crossbody bag":             "bag",
    "shoulder bag":              "bag",
    "clutch":                    "bag",
    "clutch bag":                "bag",
    "backpack":                  "bag",
    "mini bag":                  "bag",
    "micro bag":                 "bag",
    "bucket bag":                "bag",
    "satchel":                   "bag",

    "necklace":                  "jewelry",
    "earrings":                  "jewelry",
    "earring":                   "jewelry",
    "bracelet":                  "jewelry",
    "ring":                      "jewelry",
    "chain":                     "jewelry",

    "cap":                       "hat",
    "beanie":                    "hat",
    "bucket hat":                "hat",
    "baseball cap":              "hat",
    "beret":                     "hat",

    "shades":                    "sunglasses",

    # ── jumpsuits ─────────────────────────────────────────────────────────
    "overalls":                  "jumpsuit",
    "dungarees":                 "jumpsuit",
}


# ---------------------------------------------------------------------------
# Layer 3 — normalize function
# ---------------------------------------------------------------------------

def normalize_clothing_tags(tags: dict) -> dict:
    """
    Apply Layer 2 + Layer 3 normalization to raw Claude output.
    Mutates and returns a copy of tags with canonical type/subtype values.
    """
    result = dict(tags)

    # Normalize type
    raw_type = (result.get("type") or "").lower().strip()
    if raw_type in TYPE_ALIASES:
        result["type"] = TYPE_ALIASES[raw_type]
    if result.get("type") not in VALID_TYPES:
        result["type"] = "top"  # safe fallback

    canonical_type = result["type"]

    # Normalize subtype — check alias map first, then validate against master list
    raw_sub = (result.get("subtype") or "").lower().strip()
    if raw_sub in SUBTYPE_ALIASES:
        result["subtype"] = SUBTYPE_ALIASES[raw_sub]
    else:
        valid = VALID_SUBTYPES.get(canonical_type, [])
        # Exact match against valid list (case-insensitive)
        match = next((v for v in valid if v == raw_sub), None)
        if match:
            result["subtype"] = match
        else:
            # Partial match — canonical term is substring of raw or vice versa
            partial = next((v for v in valid if v in raw_sub or raw_sub in v), None)
            result["subtype"] = partial or (valid[0] if valid else raw_sub)

    # Clamp fit and formality to valid values
    if result.get("fit") not in ["loose", "oversized", "regular", "fitted", "bodycon"]:
        result["fit"] = "regular"
    if result.get("formality") not in ["casual", "smart-casual", "formal"]:
        result["formality"] = "casual"
    if result.get("season") not in ["all-season", "spring-summer", "fall-winter"]:
        result["season"] = "all-season"

    return result
