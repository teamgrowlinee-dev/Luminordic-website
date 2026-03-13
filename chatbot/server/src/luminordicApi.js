const catalog = require("../data/productCatalog.json");

const STORE_URL = (
  process.env.STORE_BASE_URL || "https://www.luminordic.com"
).replace(/\/+$/, "");

const STOPWORDS = new Set([
  "find", "search", "looking", "for", "show", "me", "do", "you", "have",
  "recommend", "suggest", "please", "a", "an", "the", "some", "any",
  "otsi", "leia", "soovita", "soovin", "tahan", "kas", "teil", "palun",
  "mulle", "sobiv", "sobivaid", "midagi", "hea", "parim", "on",
  "toode", "tooteid", "ja", "voi", "ning", "otsi", "show", "with", "for",
  "lumi", "luminordic",
]);

const TYPE_PREFERENCES = [
  { tokens: ["seerum", "serum"], types: ["serum"] },
  { tokens: ["kreem", "cream", "naokreem", "moisturizer"], types: ["face cream", "skin care"] },
  { tokens: ["toonik", "toner", "naovesi", "hydrosol", "hudrosool"], types: ["toner"] },
  { tokens: ["puhastus", "cleanser", "meigieemaldi"], types: ["cleanser"] },
  { tokens: ["spf", "sunscreen", "paikesekaitse", "paikes"], types: ["sunscreen"] },
  { tokens: ["eye", "silm", "silma"], types: ["eye care"] },
  { tokens: ["mask"], types: ["mask", "hair mask"] },
  { tokens: ["juuksesprei", "sprei", "spray"], types: ["hair spray", "detangling spray"] },
  { tokens: ["juukseoli", "oli", "oil"], types: ["hair oil", "face oil"] },
  { tokens: ["set", "komplekt"], types: ["hair set", "skin care"] },
];

function normalizeSearchWord(word) {
  let value = String(word || "").trim().toLowerCase();
  if (!value) return "";

  value = value
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/õ/g, "o")
    .replace(/ü/g, "u");

  const replacements = [
    [/shampoo(s|n|ni)?$/g, "shampoo"],
    [/sampooni(d|de|ga|le|st|sse)?$/g, "shampoo"],
    [/conditioner(s)?$/g, "conditioner"],
    [/palsami(d|de|ga|le|st|sse)?$/g, "conditioner"],
    [/maski(d|de|ga|le|st|sse)?$/g, "mask"],
    [/seerumi(d|de|ga|le|st|sse)?$/g, "seerum"],
    [/serum(s)?$/g, "seerum"],
    [/kreemi(d|de|ga|le|st|sse)?$/g, "kreem"],
    [/cream(s)?$/g, "kreem"],
    [/naokreemi(d|de|ga|le|st|sse)?$/g, "naokreem"],
    [/nahale$/g, "naha"],
    [/naole$/g, "nao"],
    [/kuivale$/g, "kuiv"],
    [/rasusele$/g, "rasune"],
    [/tundlikule$/g, "tundlik"],
    [/moisturizer(s)?$/g, "niisutus"],
    [/cleanser(s)?$/g, "puhastus"],
    [/toner(s)?$/g, "toonik"],
    [/mist(s)?$/g, "toonik"],
    [/sunscreen(s)?$/g, "spf"],
    [/sun$/g, "spf"],
    [/spf-?$/g, "spf"],
    [/juustele$/g, "juuksed"],
    [/juukse(d|te|id)?$/g, "juuksed"],
    [/hair$/g, "juuksed"],
    [/scalp$/g, "peanahk"],
    [/spray$/g, "sprei"],
    [/oil$/g, "oli"],
    [/body$/g, "keha"],
    [/face$/g, "nao"],
    [/skin$/g, "nahk"],
    [/eye$/g, "silm"],
    [/lip$/g, "huul"],
    [/dry$/g, "kuiv"],
    [/oily$/g, "rasune"],
    [/sensitive$/g, "tundlik"],
    [/acne$/g, "akne"],
    [/glow$/g, "sara"],
    [/bright(ening)?$/g, "jume"],
    [/kids?$/g, "lapsed"],
    [/children$/g, "lapsed"],
    [/men$/g, "mehed"],
  ];

  for (const [pattern, next] of replacements) {
    value = value.replace(pattern, next);
  }

  return value;
}

function normalizeSearchText(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/\s+/)
    .map(normalizeSearchWord)
    .filter(Boolean)
    .join(" ")
    .trim();
}

function buildSearchTerms(message) {
  const normalized = normalizeSearchText(message);
  const rawTokens = normalized
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

  const seen = new Set();
  const terms = [];

  function add(term) {
    const value = String(term || "").trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    terms.push(value);
  }

  add(normalized);
  if (rawTokens.length > 1) add(rawTokens.slice(0, 4).join(" "));
  for (let i = 0; i < rawTokens.length; i++) {
    add(rawTokens[i]);
    if (i < rawTokens.length - 1) add(`${rawTokens[i]} ${rawTokens[i + 1]}`);
  }

  return terms.slice(0, 6);
}

function buildSearchTokens(message) {
  return normalizeSearchText(message)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function buildSearchText(product) {
  return normalizeSearchText(
    [
      product.name,
      product.brand,
      product.productType,
      product.domain,
      product.summary,
      product.shortDescription,
      Array.isArray(product.categories) ? product.categories.join(" ") : "",
    ].join(" ")
  );
}

function buildRequestedTypes(tokens, normalizedQuery) {
  const selected = new Set();
  for (const preference of TYPE_PREFERENCES) {
    const matched = preference.tokens.some(
      (token) => tokens.includes(token) || normalizedQuery.includes(token)
    );
    if (!matched) continue;
    for (const type of preference.types) {
      selected.add(type);
    }
  }
  return selected;
}

function inferRequestedDomain(tokens, normalizedQuery) {
  const haystack = `${tokens.join(" ")} ${normalizedQuery}`.trim();
  if (/(juuksed|juukse|peanahk|hair|scalp)/.test(haystack)) {
    return "juuksehooldus";
  }
  if (/(naha|nao|face|skin|seerum|serum|toonik|toner|spf|silm|eye)/.test(haystack)) {
    return "nahahooldus";
  }
  if (/(keha|body|intiim|vulvar|hand|katekreem)/.test(haystack)) {
    return "kehahooldus";
  }
  return "";
}

function scoreProduct(product, tokens, normalizedQuery, requestedTypes, requestedDomain) {
  const name = normalizeSearchText(product.name);
  const brand = normalizeSearchText(product.brand);
  const type = normalizeSearchText(product.productType);
  const categories = normalizeSearchText(
    Array.isArray(product.categories) ? product.categories.join(" ") : ""
  );
  const searchable = buildSearchText(product);
  const matchedTokens = new Set();
  let score = 0;

  if (normalizedQuery && name.includes(normalizedQuery)) {
    score += 28;
  } else if (normalizedQuery && searchable.includes(normalizedQuery)) {
    score += 18;
  }

  if (requestedTypes.size && requestedTypes.has(product.productType)) {
    score += 20;
  }

  if (requestedDomain) {
    if (product.domain === requestedDomain) {
      score += 8;
    } else if (requestedDomain !== "kehahooldus" && product.domain === "kehahooldus") {
      score -= 8;
    }
  }

  for (const token of tokens) {
    if (!token) continue;
    if (name.indexOf(token) !== -1) {
      score += 18;
      matchedTokens.add(token);
    }
    if (brand.indexOf(token) !== -1) {
      score += 8;
      matchedTokens.add(token);
    }
    if (type.indexOf(token) !== -1) {
      score += 10;
      matchedTokens.add(token);
    }
    if (categories.indexOf(token) !== -1) {
      score += 7;
      matchedTokens.add(token);
    }
    if (searchable.indexOf(token) !== -1) {
      score += 5;
      matchedTokens.add(token);
    }
  }

  score += Number(product.variantRank || 0);
  if (product.confidence === "kõrge") score += 4;
  if (product.confidence === "keskmine") score += 2;
  if (product.url && !/^https?:\/\//i.test(product.url)) {
    score -= 2;
  }

  return { score, matchedTokenCount: matchedTokens.size };
}

async function searchProducts(message, options) {
  const limit = Math.max(1, Number((options || {}).limit || 6));
  const searchTerms = buildSearchTerms(message);
  const normalizedQuery = normalizeSearchText(message);
  const searchTokens = buildSearchTokens(message);
  const requestedTypes = buildRequestedTypes(searchTokens, normalizedQuery);
  const requestedDomain = inferRequestedDomain(searchTokens, normalizedQuery);
  const ranked = catalog
    .map((item) => ({
      item: {
        sku: item.sku || item.slug || "",
        name: item.name,
        brand: item.brand || "LUMI",
        url: String(item.url || "").startsWith("/")
          ? `${STORE_URL}${item.url}`
          : item.url,
        imageUrl: item.imageUrl || "",
        description: item.shortDescription || item.summary || "",
        price: typeof item.price === "number" ? item.price : 0,
        currency: item.currency || "EUR",
        productType: item.productType || "",
      },
      ...scoreProduct(
        item,
        searchTokens,
        normalizedQuery,
        requestedTypes,
        requestedDomain
      ),
      searchable: buildSearchText(item),
      itemName: normalizeSearchText(item.name),
    }))
    .filter((entry) => {
      if (!normalizedQuery) return false;
      if (entry.matchedTokenCount > 0) return true;
      return entry.itemName.includes(normalizedQuery) || entry.searchable.includes(normalizedQuery);
    })
    .sort(
      (a, b) =>
        b.matchedTokenCount - a.matchedTokenCount ||
        b.score - a.score ||
        String(a.item.name).localeCompare(String(b.item.name))
    )
    .map((e) => e.item);

  return {
    items: ranked.slice(0, limit),
    searchTerms,
  };
}

module.exports = {
  STORE_URL,
  searchProducts,
};
