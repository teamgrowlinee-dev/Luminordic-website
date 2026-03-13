const catalog = require("../data/productCatalog.json");

const HAIR_DOMAIN = "juuksehooldus";
const SKIN_DOMAIN = "nahahooldus";

const HAIR_EXCLUDED_TYPES = new Set(["accessory", "hair accessory"]);
const SKIN_EXCLUDED_TYPES = new Set([
  "accessory",
  "body scrub",
  "body oil",
  "body wash",
  "body lotion",
  "foot care",
  "intimate care",
  "nail care",
]);

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isSkinRoutineEligible(product) {
  if (!product || product.domain !== SKIN_DOMAIN) {
    return false;
  }

  if (SKIN_EXCLUDED_TYPES.has(product.productType)) {
    return false;
  }

  const text = normalizeText(
    [
      product.name,
      product.productType,
      product.summary,
      product.shortDescription,
    ].join(" ")
  );

  if (/\b(aftersun|after sun|body|foot|hand|nail|shower)\b/.test(text)) {
    return false;
  }

  if (product.productType !== "skin care") {
    return true;
  }

  return /\b(face|facial|serum|cream|gel|mist|spf|skin|toner|moistur|cleanser|mask|oil)\b/.test(
    text
  );
}

function isHairRoutineEligible(product) {
  if (!product || product.domain !== HAIR_DOMAIN) {
    return false;
  }

  if (HAIR_EXCLUDED_TYPES.has(product.productType)) {
    return false;
  }

  const text = normalizeText(
    [
      product.name,
      product.productType,
      product.summary,
      product.shortDescription,
    ].join(" ")
  );

  if (/\b(hand|foot|face|body|deodorant|lip|soap|shower)\b/.test(text)) {
    return false;
  }

  if (/\b(kids|kid|baby|children|child)\b/.test(text)) {
    return false;
  }

  return /\b(hair|scalp|shampoo|conditioner|mask|curl|detang|spray|oil|set|juukse|peanah)\b/.test(
    text
  );
}

function getHairCatalog() {
  return catalog.filter(isHairRoutineEligible);
}

function getSkinCatalog() {
  return catalog.filter(isSkinRoutineEligible);
}

module.exports = {
  getHairCatalog,
  getSkinCatalog,
  isHairRoutineEligible,
  isSkinRoutineEligible,
};
