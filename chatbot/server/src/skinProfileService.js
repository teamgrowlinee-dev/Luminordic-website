const { callAnthropic, hasAnthropic } = require("./anthropic");
const { CONTACT } = require("./supportData");
const { getSkinCatalog } = require("./recommendationCatalog");
const {
  getSkinAnswerEntries,
  normalizeSkinQuizAnswers,
} = require("./skinQuiz");

const CONFIDENCE_SCORES = {
  madal: 1,
  keskmine: 2,
  kõrge: 3,
};

const PROFILE_LABELS = {
  baseType: {
    balanced: "tasakaalus nahk",
    dry: "kuivem või kiskuv nahk",
    oily: "rasusem nahk",
    combination: "kombineeritud nahk",
  },
  sensitivity: {
    low: "madal tundlikkus",
    medium: "vahelduv tundlikkus",
    high: "kergesti reageeriv tundlik nahk",
  },
  breakouts: {
    rare: "harvad ebapuhtused",
    sometimes: "aeg-ajalt esinevad ebapuhtused",
    often: "sagedasemad ummistused või vistrikud",
  },
  dehydration: {
    no: "nahk ei tundu eriti janune",
    sometimes: "vahel vajab lisaniisutust",
    yes: "nahk kipub dehüdreeruma",
  },
  ageFocus: {
    no: "vananemisvastane fookus ei ole peamine",
    some: "mõõdukas huvi toonuse ja jume toetamise vastu",
    yes: "vananemisvastane tugi on oluline",
  },
  goal: {
    hydrate: "niisutus ja mugavustunne",
    calm: "tundlikkuse rahustamine",
    clarify: "ebapuhtuste kontroll",
    glow: "ühtlasem jume ja sära",
    protect: "igapäevane kaitse ja SPF",
    age: "toonuse ja elastsuse toetamine",
  },
};

const PRIMARY_SKIN_TYPES = new Set([
  "kuiv nahk",
  "rasune nahk",
  "kombineeritud nahk",
  "tundlik nahk",
  "aknele kalduv nahk",
  "dehüdreeritud nahk",
  "küps nahk",
]);

function pushUnique(list, value) {
  if (value && !list.includes(value)) {
    list.push(value);
  }
}

function overlap(left, right) {
  const source = Array.isArray(left) ? left : [];
  const target = Array.isArray(right) ? right : [];
  return source.filter((value) => target.includes(value));
}

function getFamilyId(product) {
  return String(product && product.name ? product.name : product && product.familyKey ? product.familyKey : "")
    .toLowerCase()
    .replace(/\b(refill|travel size|travel|tester|sample)\b/g, "")
    .replace(/\b\d+(?:[.,]\d+)?\s*(ml|g|pcs|pc|tk)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSkinProfile(answers) {
  const normalized = normalizeSkinQuizAnswers(answers);
  const types = [];
  const concerns = [];

  if (normalized.baseType === "dry") {
    pushUnique(types, "kuiv nahk");
    pushUnique(concerns, "niisutus");
  } else if (normalized.baseType === "oily") {
    pushUnique(types, "rasune nahk");
    pushUnique(concerns, "rasusus ja sebum");
  } else if (normalized.baseType === "combination") {
    pushUnique(types, "kombineeritud nahk");
    pushUnique(concerns, "rasusus ja sebum");
  }

  if (normalized.sensitivity === "medium" || normalized.sensitivity === "high") {
    pushUnique(types, "tundlik nahk");
    pushUnique(concerns, "tundlikkus ja punetus");
  }

  if (normalized.breakouts === "sometimes" || normalized.breakouts === "often") {
    pushUnique(types, "aknele kalduv nahk");
    pushUnique(concerns, "akne ja ebapuhtused");
    pushUnique(concerns, "rasusus ja sebum");
  }

  if (normalized.dehydration === "sometimes" || normalized.dehydration === "yes") {
    pushUnique(types, "dehüdreeritud nahk");
    pushUnique(concerns, "niisutus");
  }

  if (normalized.ageFocus === "some" || normalized.ageFocus === "yes") {
    pushUnique(types, "küps nahk");
    pushUnique(concerns, "vananemisvastane");
  }

  if (normalized.goal === "hydrate") {
    pushUnique(concerns, "niisutus");
  } else if (normalized.goal === "calm") {
    pushUnique(types, "tundlik nahk");
    pushUnique(concerns, "tundlikkus ja punetus");
  } else if (normalized.goal === "clarify") {
    pushUnique(types, "aknele kalduv nahk");
    pushUnique(concerns, "akne ja ebapuhtused");
    pushUnique(concerns, "puhastamine ja koorimine");
  } else if (normalized.goal === "glow") {
    pushUnique(concerns, "jume ja pigment");
  } else if (normalized.goal === "protect") {
    pushUnique(concerns, "päikesekaitse");
  } else if (normalized.goal === "age") {
    pushUnique(types, "küps nahk");
    pushUnique(concerns, "vananemisvastane");
  }

  if (!types.length) {
    pushUnique(types, "kõik nahatüübid");
  }

  return {
    answers: normalized,
    types,
    concerns,
    title: `${PROFILE_LABELS.baseType[normalized.baseType]}, ${PROFILE_LABELS.sensitivity[normalized.sensitivity]}`,
    summary: [
      PROFILE_LABELS.baseType[normalized.baseType],
      PROFILE_LABELS.sensitivity[normalized.sensitivity],
      PROFILE_LABELS.breakouts[normalized.breakouts],
      PROFILE_LABELS.dehydration[normalized.dehydration],
    ],
    mainGoal: PROFILE_LABELS.goal[normalized.goal],
    flags: {
      oily:
        normalized.baseType === "oily" ||
        normalized.baseType === "combination" ||
        normalized.breakouts !== "rare",
      dry:
        normalized.baseType === "dry" || normalized.dehydration !== "no",
      sensitive:
        normalized.sensitivity === "medium" || normalized.sensitivity === "high",
      acne:
        normalized.breakouts === "sometimes" || normalized.breakouts === "often",
      age:
        normalized.ageFocus === "some" ||
        normalized.ageFocus === "yes" ||
        normalized.goal === "age",
      glow: normalized.goal === "glow",
      protect: normalized.goal === "protect",
    },
  };
}

function scoreSkinProduct(product, profile) {
  const productTypes = Array.isArray(product.skinTypes) ? product.skinTypes : [];
  const productConcerns = Array.isArray(product.skinConcerns)
    ? product.skinConcerns
    : [];
  const matchedTypes = overlap(profile.types, productTypes);
  const matchedConcerns = overlap(profile.concerns, productConcerns);

  let score = (CONFIDENCE_SCORES[product.confidence] || 1) * 3;
  score += matchedTypes.length * 18;
  score += matchedConcerns.length * 14;

  if (productTypes.includes("kõik nahatüübid")) {
    score += 8;
  }

  if (profile.flags.dry && ["face cream", "face oil", "serum", "mask"].includes(product.productType)) {
    score += 6;
  }
  if (profile.flags.sensitive && ["cleanser", "serum", "face cream", "toner"].includes(product.productType)) {
    score += 5;
  }
  if (profile.flags.acne && ["cleanser", "serum", "toner", "mask"].includes(product.productType)) {
    score += 7;
  }
  if (profile.flags.protect && product.productType === "sunscreen") {
    score += 12;
  }
  if (profile.flags.age && ["serum", "face cream", "eye care"].includes(product.productType)) {
    score += 7;
  }
  if (profile.flags.glow && ["serum", "mask", "face cream"].includes(product.productType)) {
    score += 6;
  }

  if (
    product.productType === "skin care" &&
    overlap(productTypes, Array.from(PRIMARY_SKIN_TYPES)).length === 0 &&
    matchedConcerns.length === 0
  ) {
    score -= 8;
  }

  score += Number(product.variantRank || 0);

  return score;
}

function buildSkinRoles(profile) {
  const roles = [
    {
      id: "cleanser",
      label: "Puhastav alus",
      allowedTypes: ["cleanser"],
      reason:
        profile.flags.acne || profile.flags.oily
          ? "aitab nahka puhastada ilma liigset tasakaalu lõhkumata"
          : "annab rutiinile õrna ja stabiilse puhastava aluse",
    },
    {
      id: "serum",
      label: "Sihitud seerum või essents",
      allowedTypes: ["serum", "toner", "mask", "skin care"],
      reason:
        profile.flags.sensitive
          ? "toetab naha rahustamist ja mugavustunnet"
          : profile.flags.acne
            ? "aitab keskenduda ummistustele, tekstuurile ja tasakaalule"
            : "toetab sinu peamist nahahoolduse eesmärki sihitumalt",
    },
    {
      id: "moisturizer",
      label: "Niisutav viimistlus",
      allowedTypes: ["face cream", "face oil", "skin care"],
      reason:
        profile.flags.dry
          ? "aitab lukustada niiskust ja hoida naha pehmemana"
          : "annab rutiinile kaitsvama ja naha mugavust toetava lõpu",
    },
  ];

  if (profile.flags.protect) {
    roles.push({
      id: "protect",
      label: "Päevane kaitse",
      allowedTypes: ["sunscreen"],
      reason: "aitab hoida rutiinis igapäevase UV-kaitse sammu",
    });
  } else {
    roles.push({
      id: "extra",
      label: profile.flags.age ? "Täiendav sihthooldus" : "Rutiini lisatugi",
      allowedTypes: ["sunscreen", "eye care", "mask", "serum", "skin care"],
      reason:
        profile.flags.age
          ? "toetab toonust, elastsust või silmaümbruse mugavust"
          : "annab rutiinile ühe lisasammu sinu eesmärgi tugevamaks toetamiseks",
    });
  }

  return roles;
}

function toProductCard(product, role) {
  return {
    name: product.name,
    brand: product.brand,
    url: product.url,
    imageUrl: product.imageUrl,
    price: product.price || 0,
    currency: product.currency || "EUR",
    description: product.shortDescription || product.summary || "",
    recommendationRole: role.label,
    recommendationReason: role.reason,
  };
}

function selectSkinProducts(profile) {
  const ranked = getSkinCatalog()
    .map((product) => ({
      ...product,
      matchScore: scoreSkinProduct(product, profile),
    }))
    .sort(
      (left, right) =>
        right.matchScore - left.matchScore ||
        Number(right.variantRank || 0) - Number(left.variantRank || 0) ||
        String(left.name).localeCompare(String(right.name))
    );

  const roles = buildSkinRoles(profile);
  const usedFamilies = new Set();
  const selected = [];

  for (const role of roles) {
    const candidate = ranked.find((product) => {
      if (usedFamilies.has(getFamilyId(product))) {
        return false;
      }
      if (!role.allowedTypes.includes(product.productType)) {
        return false;
      }
      return product.matchScore >= 8;
    });

    if (!candidate) {
      continue;
    }

    usedFamilies.add(getFamilyId(candidate));
    selected.push(toProductCard(candidate, role));
  }

  if (selected.length < 3) {
    for (const candidate of ranked) {
      if (usedFamilies.has(getFamilyId(candidate))) {
        continue;
      }
      if (candidate.matchScore < 10) {
        continue;
      }

      usedFamilies.add(getFamilyId(candidate));
      selected.push(
        toProductCard(candidate, {
          label: "Lisasoovitus",
          reason:
            "sobitub sinu nahaprofiili ja valitud rutiini eesmärgiga hästi kokku",
        })
      );

      if (selected.length >= 4) {
        break;
      }
    }
  }

  return selected.slice(0, 4);
}

function buildSkinFallbackText(profile, products) {
  const lines = [
    "**Sinu nahaprofiil**",
    `Vastuste põhjal paistab, et sul on ${profile.title}, fookusega ${profile.mainGoal.toLowerCase()}.`,
    `Olulisemad märksõnad on: ${profile.summary.join(", ")}.`,
    "",
    "**Miks just need tooted**",
    `Eelistasin tooteid, mis kattuvad sinu nahatüübi ja vajadustega: ${profile.concerns.join(", ") || "üldine tasakaalustatud hooldus"}.`,
  ];

  if (products.length) {
    lines.push("");
    lines.push("**Soovitatud komplekt**");
    products.forEach((product, index) => {
      lines.push(
        `${index + 1}. ${product.name} - ${product.recommendationRole}, sest see ${product.recommendationReason}.`
      );
    });
  } else {
    lines.push("");
    lines.push(
      `Praegu ei leidnud ma piisavalt tugevat komplekti. Kõige kindlam on kirjutada ${CONTACT.email}.`
    );
  }

  return lines.join("\n");
}

async function buildAnthropicSkinText(profile, answers, products) {
  if (!hasAnthropic()) {
    return null;
  }

  const answerLines = getSkinAnswerEntries(answers).map(
    (entry) => `- ${entry.prompt} => ${entry.label}`
  );
  const productLines = products.length
    ? products.map((product, index) => {
        const price =
          typeof product.price === "number" && product.price
            ? `${product.price.toFixed(2)} ${product.currency || "EUR"}`
            : "hind puudub";

        return [
          `${index + 1}. ${product.name}`,
          `Roll: ${product.recommendationRole}`,
          `Miks: ${product.recommendationReason}`,
          `Hind: ${price}`,
          `URL: ${product.url}`,
        ].join("\n");
      })
    : ["Tooteid ei leitud."];

  return callAnthropic({
    systemPrompt: [
      "Sa oled LUMI nahahoolduse assistent.",
      "Vasta ainult eesti keeles.",
      "Kasuta ainult antud testivastuseid ja kandidaat-tooteid.",
      "Ära diagnoosi nahahaigusi ega anna meditsiinilisi lubadusi.",
      "Kirjuta vastus 3 lühikese osana:",
      "1. Sinu nahaprofiil",
      "2. Miks just need tooted",
      "3. Soovitatud komplekt",
      "Iga soovitatud toote juures ütle lühidalt, miks see sobib.",
    ].join("\n"),
    userPrompt: [
      "Nahatüübi testi vastused:",
      answerLines.join("\n"),
      "",
      "Deterministlik kokkuvõte:",
      `- Profiil: ${profile.title}`,
      `- Märksõnad: ${profile.summary.join(", ")}`,
      `- Põhieesmärk: ${profile.mainGoal}`,
      "",
      "Kandidaattooted LUMI poest:",
      productLines.join("\n\n"),
    ].join("\n"),
    maxTokens: 420,
  });
}

async function buildSkinProfileResponse(answers) {
  const normalized = normalizeSkinQuizAnswers(answers);
  const profile = buildSkinProfile(normalized);
  const products = selectSkinProducts(profile);
  const anthropicText = await buildAnthropicSkinText(profile, normalized, products);

  return {
    mode: "skin_profile",
    profileTitle: profile.title,
    assistantText: anthropicText || buildSkinFallbackText(profile, products),
    products,
    profile,
  };
}

module.exports = {
  buildSkinProfile,
  buildSkinProfileResponse,
};
