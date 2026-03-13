from __future__ import annotations

import html
import json
import re
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT.parent
PRODUCT_DIR = SOURCE_ROOT / "toode"
OUTPUT_PATH = ROOT / "server" / "data" / "productCatalog.json"

STORE_URL = "https://www.luminordic.com"

SIZE_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(ml|g|pcs|pc|tk)\b", re.I)
PMW_RE = re.compile(r"window\.pmwDataLayer\.products\[\d+\]\s*=\s*(\{.*?\});", re.S)
METRILO_RE = re.compile(r'metrilo\.event\("view_product",\s*(\{.*?\})\);', re.S)
SCRIPT_TAG_RE = re.compile(r"<[^>]+>")


def normalize_text(value: str) -> str:
    text = html.unescape(str(value or "")).strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return text


def normalize_url(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if text.startswith("//"):
        return "https:" + text
    if text.startswith("/"):
        return STORE_URL + text
    return text


def parse_price(value: object) -> float | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    raw = raw.replace(",", ".")
    try:
        return float(raw)
    except ValueError:
        return None


def parse_inline_json(pattern: re.Pattern[str], text: str) -> dict[str, object]:
    match = pattern.search(text)
    if not match:
        return {}
    raw = match.group(1).replace("\\/", "/")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def next_confidence(current: str, candidate: str) -> str:
    order = {"madal": 0, "keskmine": 1, "kõrge": 2}
    return candidate if order.get(candidate, 0) > order.get(current, 0) else current


def read_product_html(file_path: Path) -> dict[str, object]:
    text = file_path.read_text(encoding="utf-8", errors="ignore")
    slug = file_path.parent.name

    def find(pattern: str) -> str:
        match = re.search(pattern, text, re.I)
        return html.unescape(match.group(1).strip()) if match else ""

    pmw = parse_inline_json(PMW_RE, text)
    metrilo = parse_inline_json(METRILO_RE, text)
    categories: list[str] = []
    for item in (pmw.get("category") or []):
        if isinstance(item, dict):
            value = str(item.get("name") or "").strip()
        else:
            value = str(item or "").strip()
        if value:
            categories.append(value)
    if not categories:
        categories = [
            str(item.get("name") or "").strip()
            for item in (metrilo.get("categories") or [])
            if isinstance(item, dict) and str(item.get("name") or "").strip()
        ]

    canonical_url = normalize_url(find(r'<link rel="canonical" href="([^"]+)"'))
    if not canonical_url or canonical_url == "index.html" or not canonical_url.startswith("http"):
        canonical_url = f"{STORE_URL}/toode/{slug}/"

    return {
        "slug": slug,
        "canonicalUrl": canonical_url,
        "imageUrl": normalize_url(
            str(metrilo.get("image_url") or find(r'<meta property="og:image" content="([^"]+)"'))
        ),
        "price": parse_price(
            pmw.get("price") or metrilo.get("price") or find(r'<meta property="og:price:amount" content="([^"]+)"')
        ),
        "currency": find(r'<meta property="og:price:currency" content="([^"]+)"') or "EUR",
        "metaDescription": find(r'<meta name="description" content="([^"]+)"')
        or find(r'<meta property="og:description" content="([^"]+)"'),
        "name": str(pmw.get("name") or metrilo.get("name") or find(r'<meta property="og:title" content="([^"]+)"')).strip(),
        "sku": str(pmw.get("sku") or metrilo.get("sku") or "").strip(),
        "categories": categories,
    }


def build_family_key(slug: str) -> str:
    key = str(slug or "").strip().lower()
    key = re.sub(r"-\d+(?:[.,]\d+)?(ml|g|pcs|pc|tk)$", "", key)
    key = re.sub(r"-(refill|travel-size|travel|tester|sample)$", "", key)
    return key


def detect_size_value(text: str) -> float | None:
    match = SIZE_RE.search(str(text or ""))
    if not match:
        return None
    raw = match.group(1).replace(",", ".")
    try:
        return float(raw)
    except ValueError:
        return None


def build_variant_rank(name: str, slug: str) -> int:
    score = 5
    size = detect_size_value(name) or detect_size_value(slug)

    if size is None:
        score = 6
    elif 75 <= size <= 300:
        score = 10
    elif 301 <= size <= 500:
        score = 8
    elif 51 <= size < 75:
        score = 7
    elif size > 500:
        score = 6
    else:
        score = 5

    normalized = f"{name} {slug}".lower()
    if "refill" in normalized:
        score -= 2
    if "tester" in normalized or "sample" in normalized:
        score -= 3

    return score


def contains_any(text: str, keywords: list[str] | tuple[str, ...]) -> bool:
    return any(keyword in text for keyword in keywords)


def infer_brand(name: str) -> str:
    value = name.strip()
    if not value:
        return "LUMI"

    upper = value.upper()
    mappings = [
        ("RAER", "RAER"),
        ("BIO-KLINIK", "BIO-KLINIK"),
        ("BIOINFUSED", "BioInfused"),
        ("LUMITEEK", "LUMITEEK"),
        ("SUPERBLOOM", "Superbloom"),
        ("LOLÁ", "LOLÁ"),
        ("LOLA", "LOLÁ"),
        ("ICONIC", "ICONIC"),
        ("TUNDRA", "TUNDRA"),
        ("SKIN GYM", "SKIN GYM"),
        ("MEN ", "LUMI MEN"),
    ]
    for prefix, brand in mappings:
        if upper.startswith(prefix):
            return brand
    return "LUMI"


def infer_domain(text: str, categories: list[str]) -> str:
    categories_text = normalize_text(" ".join(categories))
    hair_specific = contains_any(text, ["juuks", "hair", "scalp", "peanah", "juuksekasv"])
    face_specific = contains_any(
        text,
        [
            "nao",
            "naha",
            "skin",
            "face",
            "seerum",
            "serum",
            "toonik",
            "naovesi",
            "hudrosool",
            "hydrosol",
            "spf",
            "silm",
        ],
    )
    body_specific = contains_any(
        text,
        ["keha", "body", "intiim", "vulvar", "katekreem", "hand", "foot", "venitusarm", "cellulite"]
    )

    if "juuksed" in categories_text and not contains_any(text, ["naovesi", "toonik", "hudrosool"]):
        return "juuksehooldus"
    if hair_specific and not face_specific:
        return "juuksehooldus"
    if "naohooldus" in categories_text and not body_specific:
        return "nahahooldus"
    if face_specific and not body_specific:
        return "nahahooldus"
    if "kehahooldus" in categories_text or body_specific:
        return "kehahooldus"
    if "toidulisandid" in categories_text or contains_any(text, ["vitamiin", "probioot", "kapsl", "supplement"]):
        return "toidulisandid"
    return "muu"


def infer_hair_product_type(text: str) -> str:
    if contains_any(text, ["hari", "brush", "lapp", "kaart", "paper", "paber"]):
        return "accessory"
    if re.search(r"(?:^|\s)(set|komplekt)(?:$|\s)", text):
        return "hair set"
    if contains_any(text, ["scalp", "peanah", "prewash", "juuksekasv", "rosemary oil"]):
        return "scalp treatment"
    if contains_any(text, ["juuksesprei", "spray", "spritzer", "water", "rosemary water"]):
        if contains_any(text, ["lokk", "kahu", "kammit", "silub", "detang"]):
            return "detangling spray"
        return "hair spray"
    if contains_any(text, [" oli", " oil", "õli"]):
        return "hair oil"
    if contains_any(text, ["shampoo", "sampoon"]):
        return "shampoo"
    if contains_any(text, ["conditioner", "palsam"]):
        return "conditioner"
    if "mask" in text:
        return "hair mask"
    return "hair care"


def infer_skin_product_type(text: str) -> str:
    if contains_any(text, ["hari", "brush", "lapp", "kaart", "paper", "paber"]):
        return "accessory"
    if re.search(r"(?:^|\s)(set|komplekt)(?:$|\s)", text):
        return "skin care"
    if contains_any(text, ["spf", "sun filter", "paikes", "sunscreen", "skin filter"]):
        return "sunscreen"
    if contains_any(text, ["silm", "eye"]):
        return "eye care"
    if contains_any(text, ["puhastus", "meigieemaldi", "cleanser"]):
        return "cleanser"
    if contains_any(text, ["seerum", "serum"]):
        return "serum"
    if contains_any(text, ["toonik", "naovesi", "hudrosool", "hydrosol", "mist", "lillevesi"]):
        return "toner"
    if "mask" in text:
        return "mask"
    if contains_any(text, [" oli", " oil", "õli"]) and not contains_any(text, ["keha", "body", "intiim"]):
        return "face oil"
    if contains_any(text, ["kreem", "cream", "balm"]) and not contains_any(text, ["katekreem", "body", "keha", "intiim"]):
        return "face cream"
    return "skin care"


def unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        value = item.strip()
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def infer_hair_tags(text: str) -> tuple[list[str], list[str], str]:
    types: list[str] = []
    concerns: list[str] = []
    confidence = "madal"

    if contains_any(text, ["peanah", "scalp", "rahusta", "sensitive scalp"]):
        types.append("tundlik peanahk")
        concerns.append("peanaha rahustamine")
        confidence = next_confidence(confidence, "keskmine")
    if contains_any(text, ["ketend", "koom", "dandruff"]):
        types.extend(["kõõm ja ketendav peanahk", "tundlik peanahk"])
        concerns.extend(["kõõm", "peanaha rahustamine"])
        confidence = "kõrge"
    if contains_any(text, ["rasu", "oily scalp", "clarify"]):
        types.append("rasune peanahk")
        concerns.append("rasusus ja tasakaal")
        confidence = next_confidence(confidence, "keskmine")
    if contains_any(text, ["niisut", "hyaluron", "hualuroon", "dry", "soft", "smooth"]):
        types.append("kuivad juuksed")
        concerns.append("niisutus")
        confidence = next_confidence(confidence, "keskmine")
    if contains_any(text, ["damage", "repair", "taast", "tugevd", "strengthen"]):
        types.append("kahjustatud juuksed")
        concerns.append("kahjustus ja parandus")
        confidence = (
            "kõrge"
            if "repair" in text or "taast" in text
            else next_confidence(confidence, "keskmine")
        )
    if contains_any(text, ["curl", "lokk", "frizz", "kahu"]):
        types.append("lokkis/lainelised juuksed")
        concerns.extend(["lokkide talitsus", "sasipuntrad ja kammitavus"])
        confidence = next_confidence(confidence, "keskmine")
    if contains_any(text, ["growth", "juuksekasv", "volum", "kohev"]):
        types.append("peened/õhukesed juuksed")
        concerns.append("maht ja kasv")
        confidence = "kõrge" if "juuksekasv" in text else "keskmine"
    if contains_any(text, ["color", "varv"]):
        types.append("värvitud juuksed")
        concerns.append("värvikaitse")
        confidence = "keskmine"

    if not types:
        types.append("kõik juuksetüübid")
    if not concerns:
        concerns.append("niisutus")

    if "kõrge" not in confidence and contains_any(text, ["juuksed", "hair", "scalp", "peanah"]):
        confidence = next_confidence(confidence, "keskmine")

    return unique(types), unique(concerns), confidence


def infer_skin_tags(text: str) -> tuple[list[str], list[str], str]:
    types: list[str] = []
    concerns: list[str] = []
    confidence = "madal"

    if contains_any(text, ["kuiv", "dry"]):
        types.append("kuiv nahk")
        concerns.append("niisutus")
        confidence = next_confidence(confidence, "keskmine")
    if contains_any(text, ["dehyd", "dehudreer", "janune"]):
        types.append("dehüdreeritud nahk")
        concerns.append("niisutus")
        confidence = "kõrge"
    if contains_any(text, ["rasune", "oily", "sebum"]):
        types.append("rasune nahk")
        concerns.append("rasusus ja sebum")
        confidence = next_confidence(confidence, "keskmine")
    if contains_any(text, ["kombineeritud", "combination"]):
        types.append("kombineeritud nahk")
        concerns.append("rasusus ja sebum")
        confidence = next_confidence(confidence, "keskmine")
    if contains_any(text, ["tundlik", "sensitive", "punet", "atoop", "rahusta", "microbiome", "mikrobioom"]):
        types.append("tundlik nahk")
        concerns.append("tundlikkus ja punetus")
        confidence = "kõrge" if contains_any(text, ["atoop", "tundlik"]) else "keskmine"
    if contains_any(text, ["akne", "vistrik", "pimple", "breakout", "ebapuht"]):
        types.append("aknele kalduv nahk")
        concerns.append("akne ja ebapuhtused")
        confidence = "kõrge"
    if contains_any(text, ["aha", "bha", "koor", "exfol", "puhastus", "cleanser", "meigieemaldi"]):
        concerns.append("puhastamine ja koorimine")
        confidence = next_confidence(confidence, "keskmine")
    if contains_any(text, ["peptiid", "peptide", "retinol", "bio-alternatiiv", "collagen", "kollageen", "well-aging", "korts"]):
        types.append("küps nahk")
        concerns.append("vananemisvastane")
        confidence = "kõrge"
    if contains_any(text, ["glow", "sara", "bright", "jume", "vitamin c", "pigment"]):
        concerns.append("jume ja pigment")
        confidence = next_confidence(confidence, "keskmine")
    if contains_any(text, ["spf", "paikes", "sunscreen", "sun filter", "skin filter"]):
        concerns.append("päikesekaitse")
        confidence = "kõrge"

    if not types:
        types.append("kõik nahatüübid")
    if not concerns:
        concerns.append("niisutus")

    if "kõrge" not in confidence and contains_any(text, ["naha", "skin", "face", "nao", "näo"]):
        confidence = next_confidence(confidence, "keskmine")

    return unique(types), unique(concerns), confidence


def row_to_product(file_path: Path) -> dict[str, object] | None:
    html_data = read_product_html(file_path)
    slug = str(html_data.get("slug") or "").strip()
    name = str(html_data.get("name") or "").strip()
    if not slug or not name:
        return None

    categories = [
        category
        for category in (html_data.get("categories") or [])
        if str(category or "").strip()
    ]
    summary = str(html_data.get("metaDescription") or "").strip()
    combined_text = normalize_text(" ".join([name, summary, *categories]))
    domain = infer_domain(combined_text, categories)

    hair_types: list[str] = []
    hair_concerns: list[str] = []
    skin_types: list[str] = []
    skin_concerns: list[str] = []
    product_type = "general"
    confidence = "madal"

    if domain == "juuksehooldus":
        product_type = infer_hair_product_type(combined_text)
        hair_types, hair_concerns, confidence = infer_hair_tags(combined_text)
    elif domain == "nahahooldus":
        product_type = infer_skin_product_type(combined_text)
        skin_types, skin_concerns, confidence = infer_skin_tags(combined_text)
    elif domain == "kehahooldus":
        if contains_any(combined_text, ["intiim", "vulvar"]):
            product_type = "intimate care"
        elif contains_any(combined_text, ["scrub", "koorija"]):
            product_type = "body scrub"
        elif contains_any(combined_text, ["oli", "oil"]):
            product_type = "body oil"
        else:
            product_type = "body lotion"
    elif domain == "toidulisandid":
        product_type = "supplement"
    else:
        product_type = "accessory" if contains_any(combined_text, ["hari", "brush", "lapp", "kaart", "küünal", "candle"]) else "general"

    return {
        "slug": slug,
        "sku": str(html_data.get("sku") or "").strip(),
        "familyKey": build_family_key(slug),
        "variantRank": build_variant_rank(name, slug),
        "name": name,
        "brand": infer_brand(name),
        "url": str(html_data.get("canonicalUrl") or f"{STORE_URL}/toode/{slug}/").strip(),
        "imageUrl": str(html_data.get("imageUrl") or "").strip(),
        "price": html_data.get("price"),
        "currency": str(html_data.get("currency") or "EUR").strip() or "EUR",
        "domain": domain,
        "productType": product_type,
        "analysisTarget": domain,
        "hairTypes": hair_types,
        "hairConcerns": hair_concerns,
        "skinTypes": skin_types,
        "skinConcerns": skin_concerns,
        "summary": summary,
        "shortDescription": summary,
        "confidence": confidence,
        "categories": categories,
    }


def main() -> None:
    products = []
    for file_path in sorted(PRODUCT_DIR.glob("*/index.html")):
        product = row_to_product(file_path)
        if product:
            products.append(product)

    products.sort(key=lambda item: (str(item["domain"]), str(item["name"]).lower()))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(products, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Wrote {len(products)} products to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
