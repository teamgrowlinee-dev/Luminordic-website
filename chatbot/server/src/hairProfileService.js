const { callAnthropic, hasAnthropic } = require("./anthropic");
const { CONTACT } = require("./supportData");
const { getHairCatalog } = require("./recommendationCatalog");
const {
  getHairAnswerEntries,
  normalizeHairQuizAnswers,
} = require("./hairQuiz");

const CONFIDENCE_SCORES = {
  madal: 1,
  keskmine: 2,
  kõrge: 3,
};

const PROFILE_LABELS = {
  scalp: {
    balanced: "tasakaalus peanahk",
    dry: "kuiv või kiskuv peanahk",
    oily: "kiirelt rasuseks muutuvad juured",
    flaky: "tundlik või ketendav peanahk",
  },
  lengths: {
    balanced: "pigem probleemivabad pikkused",
    dry: "kuivemad pikkused",
    frizzy: "kahused pikkused",
    damaged: "kahjustatud pikkused",
  },
  pattern: {
    straight: "sirged juuksed",
    wavy: "lainelised juuksed",
    curly: "lokkis juuksed",
    coily: "väga lokkis juuksed",
  },
  thickness: {
    fine: "peenem juuksekarv",
    medium: "keskmise tugevusega juuksekarv",
    coarse: "tugevam juuksekarv",
  },
  processing: {
    minimal: "vähe töötlust",
    color: "värvitud juuksed",
    heat: "sage kuumastress",
    bleached: "tugevam töötlus või blondeerimine",
  },
  goal: {
    balanced: "tasakaalustatud hooldus",
    moisture: "niisutus ja pehmus",
    repair: "taastamine ja tugevdamine",
    scalp: "peanaha tasakaal",
    volume: "kergus ja kohevus",
    curl: "lokkide definitsioon",
    color: "värvikaitse",
  },
};

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

function inferHairGoal(normalized) {
  if (normalized.scalp === "flaky" || normalized.scalp === "oily") {
    return "scalp";
  }

  if (
    normalized.lengths === "damaged" ||
    normalized.processing === "heat" ||
    normalized.processing === "bleached"
  ) {
    return "repair";
  }

  if (
    normalized.lengths === "dry" ||
    normalized.lengths === "frizzy" ||
    normalized.scalp === "dry"
  ) {
    return "moisture";
  }

  if (
    normalized.pattern === "wavy" ||
    normalized.pattern === "curly" ||
    normalized.pattern === "coily"
  ) {
    return "curl";
  }

  if (normalized.thickness === "fine") {
    return "volume";
  }

  if (normalized.processing === "color") {
    return "color";
  }

  return "balanced";
}

function buildHairProfile(answers) {
  const normalized = normalizeHairQuizAnswers(answers);
  const types = [];
  const concerns = [];
  const inferredGoal = inferHairGoal(normalized);

  if (normalized.scalp === "dry") {
    pushUnique(types, "tundlik peanahk");
    pushUnique(concerns, "peanaha rahustamine");
    pushUnique(concerns, "niisutus");
  } else if (normalized.scalp === "oily") {
    pushUnique(types, "rasune peanahk");
    pushUnique(concerns, "rasusus ja tasakaal");
  } else if (normalized.scalp === "flaky") {
    pushUnique(types, "kõõm ja ketendav peanahk");
    pushUnique(types, "tundlik peanahk");
    pushUnique(concerns, "kõõm");
    pushUnique(concerns, "peanaha rahustamine");
  }

  if (normalized.lengths === "dry") {
    pushUnique(types, "kuivad juuksed");
    pushUnique(concerns, "niisutus");
  } else if (normalized.lengths === "frizzy") {
    pushUnique(types, "kuivad juuksed");
    pushUnique(concerns, "niisutus");
    pushUnique(concerns, "lokkide talitsus");
    pushUnique(concerns, "sasipuntrad ja kammitavus");
  } else if (normalized.lengths === "damaged") {
    pushUnique(types, "kahjustatud juuksed");
    pushUnique(concerns, "kahjustus ja parandus");
  }

  if (normalized.pattern === "wavy" || normalized.pattern === "curly" || normalized.pattern === "coily") {
    pushUnique(types, "lokkis/lainelised juuksed");
    pushUnique(concerns, "lokkide talitsus");
  }

  if (normalized.thickness === "fine") {
    pushUnique(types, "peened/õhukesed juuksed");
    pushUnique(concerns, "maht ja kasv");
  }

  if (normalized.processing === "color") {
    pushUnique(types, "värvitud juuksed");
    pushUnique(concerns, "värvikaitse");
  } else if (
    normalized.processing === "heat" ||
    normalized.processing === "bleached"
  ) {
    pushUnique(types, "kahjustatud juuksed");
    pushUnique(concerns, "kahjustus ja parandus");
  }

  if (inferredGoal === "moisture") {
    pushUnique(types, "kuivad juuksed");
    pushUnique(concerns, "niisutus");
  } else if (inferredGoal === "repair") {
    pushUnique(types, "kahjustatud juuksed");
    pushUnique(concerns, "kahjustus ja parandus");
  } else if (inferredGoal === "scalp") {
    pushUnique(concerns, "peanaha rahustamine");
  } else if (inferredGoal === "volume") {
    pushUnique(types, "peened/õhukesed juuksed");
    pushUnique(concerns, "maht ja kasv");
  } else if (inferredGoal === "curl") {
    pushUnique(types, "lokkis/lainelised juuksed");
    pushUnique(concerns, "lokkide talitsus");
  } else if (inferredGoal === "color") {
    pushUnique(types, "värvitud juuksed");
    pushUnique(concerns, "värvikaitse");
  }

  if (!types.length) {
    pushUnique(types, "kõik juuksetüübid");
  }

  return {
    answers: normalized,
    types,
    concerns,
    title: `${PROFILE_LABELS.pattern[normalized.pattern]}, ${PROFILE_LABELS.thickness[normalized.thickness]}`,
    summary: [
      PROFILE_LABELS.scalp[normalized.scalp],
      PROFILE_LABELS.lengths[normalized.lengths],
      PROFILE_LABELS.pattern[normalized.pattern],
      PROFILE_LABELS.processing[normalized.processing],
    ],
    inferredGoal,
    mainGoal: PROFILE_LABELS.goal[inferredGoal],
    flags: {
      scalp:
        normalized.scalp === "dry" ||
        normalized.scalp === "oily" ||
        normalized.scalp === "flaky" ||
        inferredGoal === "scalp",
      dryness:
        normalized.lengths === "dry" ||
        normalized.lengths === "frizzy" ||
        inferredGoal === "moisture",
      repair:
        normalized.lengths === "damaged" ||
        normalized.processing === "heat" ||
        normalized.processing === "bleached" ||
        inferredGoal === "repair",
      curl:
        normalized.pattern === "wavy" ||
        normalized.pattern === "curly" ||
        normalized.pattern === "coily" ||
        inferredGoal === "curl",
      volume:
        normalized.thickness === "fine" || inferredGoal === "volume",
      color:
        normalized.processing === "color" ||
        normalized.processing === "bleached" ||
        inferredGoal === "color",
    },
  };
}

function scoreHairProduct(product, profile) {
  const productTypes = Array.isArray(product.hairTypes) ? product.hairTypes : [];
  const productConcerns = Array.isArray(product.hairConcerns)
    ? product.hairConcerns
    : [];
  const matchedTypes = overlap(profile.types, productTypes);
  const matchedConcerns = overlap(profile.concerns, productConcerns);

  let score = (CONFIDENCE_SCORES[product.confidence] || 1) * 3;
  score += matchedTypes.length * 18;
  score += matchedConcerns.length * 13;

  if (productTypes.includes("kõik juuksetüübid")) {
    score += 8;
  }

  if (profile.flags.scalp && product.productType === "scalp treatment") {
    score += 12;
  }
  if (profile.flags.scalp && product.productType === "shampoo") {
    score += 5;
  }
  if (
    profile.flags.curl &&
    ["conditioner", "conditioner bar", "hair mask", "detangling spray"].includes(
      product.productType
    )
  ) {
    score += 8;
  }
  if (
    profile.flags.dryness &&
    ["conditioner", "conditioner bar", "hair mask"].includes(product.productType)
  ) {
    score += 6;
  }
  if (profile.flags.repair && product.productType === "hair mask") {
    score += 8;
  }
  if (
    profile.flags.volume &&
    ["hair spray", "shampoo", "conditioner"].includes(product.productType)
  ) {
    score += 5;
  }
  if (
    profile.flags.color &&
    ["shampoo", "conditioner", "hair mask"].includes(product.productType)
  ) {
    score += 5;
  }

  score += Number(product.variantRank || 0);

  return score;
}

function buildHairRoles(profile) {
  const roles = [
    {
      id: "cleanser",
      label: "Hoolduse alus",
      allowedTypes: ["shampoo", "shampoo bar", "scalp treatment", "hair set"],
      reason:
        profile.flags.scalp
          ? "aitab hoida peanaha ja juured tasakaalus ilma pikkusi üle koormamata"
          : "annab rutiinile õrna, kuid sihitud puhastava aluse",
    },
    {
      id: "daily",
      label: "Igapäevane hooldus",
      allowedTypes: [
        "conditioner",
        "conditioner bar",
        "hair mask",
        "hair spray",
        "hair oil",
        "hair set",
      ],
      reason:
        profile.flags.dryness || profile.flags.curl
          ? "lisab pehmust, niisutust ja aitab kahu paremini kontrolli all hoida"
          : "annab juustele igapäevast siledust ja paremat kammitavust",
    },
  ];

  if (profile.flags.repair || profile.flags.color || profile.flags.dryness) {
    roles.push({
      id: "intensive",
      label: "Sügavam taastav hooldus",
      allowedTypes: [
        "hair mask",
        "conditioner",
        "conditioner bar",
        "hair oil",
        "scalp treatment",
        "hair set",
      ],
      reason:
        profile.flags.repair
          ? "toetab kahjustatud või töödeldud pikkuste taastamist"
          : "annab kord nädalas intensiivsema niisutuse ja pehmuse",
    });
  }

  if (profile.flags.scalp) {
    roles.push({
      id: "scalp",
      label: "Peanaha sihthooldus",
      allowedTypes: ["scalp treatment"],
      reason: "toetab peanaha mikrokeskkonda ja aitab ebamugavust tasakaalustada",
    });
  }

  if (profile.flags.curl || profile.flags.volume) {
    roles.push({
      id: "finish",
      label: profile.flags.curl ? "Loki viimistlus" : "Kohevust toetav viimistlus",
      allowedTypes: profile.flags.curl
        ? ["detangling spray", "hair spray", "hair oil"]
        : ["hair spray", "detangling spray", "hair oil"],
      reason:
        profile.flags.curl
          ? "aitab juuksekuju paremini esile tuua ja kahu taltsutada"
          : "annab lõpptulemusele kergust ja veidi rohkem õhulisust",
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

function selectHairProducts(profile) {
  const ranked = getHairCatalog()
    .map((product) => ({
      ...product,
      matchScore: scoreHairProduct(product, profile),
    }))
    .sort(
      (left, right) =>
        right.matchScore - left.matchScore ||
        Number(right.variantRank || 0) - Number(left.variantRank || 0) ||
        String(left.name).localeCompare(String(right.name))
    );

  const roles = buildHairRoles(profile);
  const usedFamilies = new Set();
  const selected = [];

  for (const role of roles) {
    const candidate = ranked.find((product) => {
      if (usedFamilies.has(getFamilyId(product))) {
        return false;
      }
      if (role.id === "scalp" && /\bshampoo\b/i.test(String(product.name || ""))) {
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
            "sobitub sinu vastuste põhjal hästi ülejäänud rutiiniga ja toetab sama eesmärki",
        })
      );

      if (selected.length >= 4) {
        break;
      }
    }
  }

  return selected.slice(0, 4);
}

function buildHairFallbackText(profile, products) {
  const lines = [
    "**Sinu juukseprofiil**",
    `Vastuste põhjal paistab, et sul on ${profile.title}, fookusega ${profile.mainGoal.toLowerCase()}.`,
    `Olulisemad märksõnad on: ${profile.summary.join(", ")}.`,
    "",
    "**Miks just need tooted**",
    `Eelistasin tooteid, mis kattuvad sinu juuksetüübi ja vajadustega: ${profile.concerns.join(", ") || "üldine tasakaalustatud hooldus"}.`,
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

async function buildAnthropicHairText(profile, answers, products) {
  if (!hasAnthropic()) {
    return null;
  }

  const answerLines = getHairAnswerEntries(answers).map(
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
      "Sa oled LUMI juuksehoolduse assistent.",
      "Vasta ainult eesti keeles.",
      "Kasuta ainult antud testivastuseid ja kandidaat-tooteid.",
      "Ära diagnoosi haigusi ega anna meditsiinilisi lubadusi.",
      "Kirjuta vastus 3 lühikese osana:",
      "1. Sinu juukseprofiil",
      "2. Miks just need tooted",
      "3. Soovitatud komplekt",
      "Iga soovitatud toote juures ütle lühidalt, miks see sobib.",
    ].join("\n"),
    userPrompt: [
      "Juuksetüübi testi vastused:",
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

async function buildHairProfileResponse(answers) {
  const normalized = normalizeHairQuizAnswers(answers);
  const profile = buildHairProfile(normalized);
  const products = selectHairProducts(profile);
  const anthropicText = await buildAnthropicHairText(profile, normalized, products);

  return {
    mode: "hair_profile",
    profileTitle: profile.title,
    assistantText: anthropicText || buildHairFallbackText(profile, products),
    products,
    profile,
  };
}

module.exports = {
  buildHairProfile,
  buildHairProfileResponse,
};
