const { callAnthropic, hasAnthropic } = require("./anthropic");
const { searchProducts } = require("./luminordicApi");
const { detectIntent } = require("./intent");
const {
  ANTHROPIC_SYSTEM_PROMPT,
  CONTACT,
  buildSupportContext,
  detectLocale,
  getSupportMessage,
} = require("./supportData");

function buildSupportResponse(intent, locale) {
  const text = getSupportMessage(intent.replace("support_", ""), locale);
  return {
    mode: "support",
    assistantText: text,
    products: [],
  };
}

async function buildAnthropicSupportResponse(message, intent, locale) {
  const context = buildSupportContext(intent, locale);
  const userPrompt = [
    `Customer message: ${message}`,
    "",
    "Context:",
    context,
    "",
    `Reply in 1-3 sentences in ${
      locale === "et" ? "Estonian" : "English"
    }. If relevant, add a link to the appropriate page at the end.`,
  ].join("\n");

  const text = await callAnthropic({
    systemPrompt: ANTHROPIC_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 220,
  });

  return text || null;
}

async function buildAnthropicShoppingText(message, products, locale) {
  if (!products.length) {
    return null;
  }

  const productLines = products.map((product, index) => {
    const price =
      typeof product.price === "number" && product.price
        ? `${product.price} ${product.currency || "EUR"}`
        : "price not available";
    return [
      `${index + 1}. ${product.name}`,
      `Price: ${price}`,
      `URL: ${product.url}`,
    ].join("\n");
  });

  const userPrompt = [
    `Customer search: ${message}`,
    "",
    "Found products:",
    productLines.join("\n\n"),
    "",
    `Write 1-2 sentences in ${
      locale === "et" ? "Estonian" : "English"
    } summarising the results. Do not invent new products.`,
  ].join("\n");

  const text = await callAnthropic({
    systemPrompt: ANTHROPIC_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 180,
  });

  return text || null;
}

function buildShoppingText(message, products, locale) {
  if (!products.length) {
    return locale === "et"
      ? `Ma ei leidnud otsingule "${message}" täpseid vasteid. Proovi täpsemat märksõna, näiteks "seerum kuivale nahale", "juuksesprei" või "SPF".`
      : `I could not find close matches for "${message}". Try a more specific search like "serum for dry skin", "hair spray" or "SPF".`;
  }
  return locale === "et"
    ? `Siin on LUMI parimad vasted otsingule "${message}". Ava tooteleht, et näha detaile ja koostist.`
    : `Here are LUMI's best matches for "${message}". Open a product page to see the details.`;
}

async function buildChatResponse(message) {
  const cleanMessage = String(message || "").trim();
  const intent = detectIntent(cleanMessage);
  const locale = detectLocale(cleanMessage);

  if (!cleanMessage) {
    return {
      mode: "smalltalk",
      assistantText:
        locale === "et" ? "Sisesta küsimus või tooteotsing." : "Enter a question or product search.",
      products: [],
    };
  }

  if (/juukset[üu]übi test/i.test(cleanMessage)) {
    return {
      mode: "smalltalk",
      assistantText:
        'Juuksetüübi testi saad alustada all olevast nupust "Juuksetüübi test". Vastad valikvastustega küsimustele ja seejärel soovitan sobiva komplekti.',
      products: [],
    };
  }

  if (/nahat[üu]übi test/i.test(cleanMessage)) {
    return {
      mode: "smalltalk",
      assistantText:
        'Nahatüübi testi saad alustada all olevast nupust "Nahatüübi test". Vastad valikvastustega küsimustele ja seejärel soovitan sobiva nahahoolduse rutiini.',
      products: [],
    };
  }

  if (intent === "greeting") {
    return {
      mode: "smalltalk",
      assistantText: getSupportMessage("greeting", locale),
      products: [],
    };
  }

  if (intent === "smalltalk") {
    if (hasAnthropic()) {
      const anthropicText = await buildAnthropicSupportResponse(
        cleanMessage,
        "smalltalk",
        locale
      );
      if (anthropicText) {
        return { mode: "smalltalk", assistantText: anthropicText, products: [] };
      }
    }
    return {
      mode: "smalltalk",
      assistantText: getSupportMessage("smalltalk", locale),
      products: [],
    };
  }

  if (intent === "escalation") {
    if (hasAnthropic()) {
      const anthropicText = await buildAnthropicSupportResponse(
        cleanMessage,
        "escalation",
        locale
      );
      if (anthropicText) {
        return { mode: "support", assistantText: anthropicText, products: [] };
      }
    }
    return {
      mode: "support",
      assistantText: getSupportMessage("escalation", locale),
      products: [],
    };
  }

  if (intent.startsWith("support_")) {
    if (hasAnthropic()) {
      const anthropicText = await buildAnthropicSupportResponse(
        cleanMessage,
        intent,
        locale
      );
      if (anthropicText) {
        return { mode: "support", assistantText: anthropicText, products: [] };
      }
    }
    return buildSupportResponse(intent, locale);
  }

  // Product search
  const searchResult = await searchProducts(cleanMessage, { limit: 6 });
  if (searchResult.items.length) {
    const anthropicText = hasAnthropic()
      ? await buildAnthropicShoppingText(
          cleanMessage,
          searchResult.items,
          locale
        )
      : null;
    return {
      mode: "shopping",
      assistantText:
        anthropicText ||
        buildShoppingText(cleanMessage, searchResult.items, locale),
      products: searchResult.items,
      searchTerms: searchResult.searchTerms,
    };
  }

  if (intent === "shopping") {
    return {
      mode: "shopping",
      assistantText: buildShoppingText(cleanMessage, [], locale),
      products: [],
      searchTerms: searchResult.searchTerms,
    };
  }

  return {
    mode: "support",
    assistantText: hasAnthropic()
      ? (await buildAnthropicSupportResponse(cleanMessage, "general", locale)) ||
        `${getSupportMessage("general", locale)} ${
          locale === "et" ? "Kiireim kontakt:" : "Quickest contact:"
        } ${CONTACT.email}.`
      : `${getSupportMessage("general", locale)} ${
          locale === "et" ? "Kiireim kontakt:" : "Quickest contact:"
        } ${CONTACT.email}.`,
    products: [],
  };
}

module.exports = {
  buildChatResponse,
};
