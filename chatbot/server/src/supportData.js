const STORE_URL = (
  process.env.STORE_BASE_URL || "https://www.luminordic.com"
).replace(/\/+$/, "");

const CONTACT = {
  company: "PERFECT COSMETICS OÜ",
  phone: "+372 5663 2033",
  email: "hei@luminordic.com",
  hours: "E-R 9.00-17.00",
  showroom: "Volta 1, Tallinn",
  showroomHours: "E-N 11.00-18.00",
};

const LINKS = {
  home: `${STORE_URL}/`,
  contact: `${STORE_URL}/kontakt/`,
  delivery: `${STORE_URL}/kontakt/`,
  returns: `${STORE_URL}/kontakt/`,
  terms: `${STORE_URL}/kontakt/`,
  privacy: `${STORE_URL}/privacy-policy/`,
  about: `${STORE_URL}/meist/`,
};

const SUPPORT_MESSAGES = {
  et: {
    greeting:
      "Tere! Olen LUMI assistent. Aitan leida sobivaid tooteid ning vastan tarne, tellimuse ja kontaktiga seotud küsimustele.",
    smalltalk:
      "Kirjuta, millist toodet otsid, või küsi tarne, tagastuse, makse või tellimuse kohta.",
    general:
      `Saan aidata tootesoovituste, tarne, tagastuse, makse, tellimuse ja kontaktiküsimustega. Kiireim kontakt on ${CONTACT.email}.`,
    escalation:
      `Kui teema on kiire või ebamugav, soovitan võtta otse ühendust LUMI klienditoega: ${CONTACT.email} (${CONTACT.hours}).`,
    contact:
      `LUMI klienditugi: ${CONTACT.email}, ${CONTACT.phone}. E-poe klienditugi töötab ${CONTACT.hours}. Esinduspood asub ${CONTACT.showroom} ja on avatud ${CONTACT.showroomHours}. Rohkem: ${LINKS.contact}`,
    shipping:
      `LUMI kontaktilehe järgi lahkuvad tooted tavaliselt hiljemalt 5 tööpäeva jooksul ja Eestis jõuab pakk enamasti kohale järgmisel või ülejärgmisel päeval. Kui vajad oma tellimuse kohta täpset infot, kirjuta ${CONTACT.email}. Rohkem: ${LINKS.delivery}`,
    returns:
      `Selle klooni põhjal ei ole eraldi detailset tagastusjuhendit avalikult näha. Kõige kindlam on enne tagastust kirjutada ${CONTACT.email}, et saada täpsed juhised. Kontakt: ${LINKS.contact}`,
    payment:
      `Selle klooni põhjal ei ole eraldi maksetingimuste lehte avalikult näha. Kui vajad täpsustust makseviiside või arve kohta, kirjuta ${CONTACT.email}. Kontakt: ${LINKS.contact}`,
    order:
      `Tellimuse staatuse, viivituse või tarneprobleemi korral kirjuta ${CONTACT.email}. Lisa juurde tellimuse number ja lühike kirjeldus.`,
  },
  en: {
    greeting:
      "Hi! I'm LUMI's assistant. I can help you find products and answer delivery, order and contact questions.",
    smalltalk:
      "Ask for a product recommendation, or ask about delivery, returns, payment or your order.",
    general:
      `I can help with product recommendations plus delivery, returns, payment, order and contact questions. The quickest contact is ${CONTACT.email}.`,
    escalation:
      `If this is urgent or frustrating, the fastest route is to contact LUMI support directly at ${CONTACT.email} (${CONTACT.hours}).`,
    contact:
      `LUMI customer support: ${CONTACT.email}, ${CONTACT.phone}. Online support hours: ${CONTACT.hours}. The showroom is at ${CONTACT.showroom} and is open ${CONTACT.showroomHours}. More: ${LINKS.contact}`,
    shipping:
      `According to LUMI's contact page, goods leave production within 5 workdays at the latest and Estonia deliveries usually arrive on the next or following day. For exact order-specific timing, please contact ${CONTACT.email}. More: ${LINKS.delivery}`,
    returns:
      `A separate detailed returns page is not clearly available in this site clone. The safest option is to contact ${CONTACT.email} before returning anything so the team can give exact instructions. Contact: ${LINKS.contact}`,
    payment:
      `A separate detailed payment terms page is not clearly available in this site clone. For payment-method or invoice questions, please contact ${CONTACT.email}. Contact: ${LINKS.contact}`,
    order:
      `For order status, delays or delivery issues, please email ${CONTACT.email} and include your order number plus a short summary of the issue.`,
  },
};

const STORE_KNOWLEDGE = [
  `Store: LUMI / Luminordic (${STORE_URL})`,
  `Company: ${CONTACT.company}`,
  `Email: ${CONTACT.email}`,
  `Phone: ${CONTACT.phone}`,
  `Online support hours: ${CONTACT.hours}`,
  `Showroom: ${CONTACT.showroom}`,
  `Showroom hours: ${CONTACT.showroomHours}`,
  "",
  "Product focus: natural skincare, haircare, bodycare and selected wellness products.",
  "",
  "Verified public site details:",
  "- Goods leave production within 5 workdays at the latest unless stated otherwise on the product page.",
  "- Orders are often dispatched the same day.",
  "- Estonia deliveries usually arrive on the next or following day.",
  "- A separate detailed returns or payment policy page is not clearly available in this mirrored site snapshot.",
  "",
  `Contact page: ${LINKS.contact}`,
  `Privacy policy: ${LINKS.privacy}`,
  `About page: ${LINKS.about}`,
].join("\n");

const ANTHROPIC_SYSTEM_PROMPT = [
  "You are LUMI's customer service and shop assistant.",
  "Reply in the same language the customer uses (Estonian or English).",
  "Be concise, practical and helpful.",
  "For customer service questions, answer only from the verified store knowledge below.",
  "Do not invent shipping, returns, payment or contact details.",
  "If product data is provided separately, use it but do not invent missing products.",
  `If information is insufficient, direct the customer to ${CONTACT.email}.`,
  "",
  "STORE KNOWLEDGE:",
  STORE_KNOWLEDGE,
].join("\n");

function detectLocale(message) {
  const text = String(message || "").trim().toLowerCase();
  if (!text) return "et";
  if (/[õäöü]/i.test(text)) return "et";
  if (/(tere|ait[aä]h|palun|tarne|tagastus|makse|tellimus|juukse|naha|toode|klienditugi)/i.test(text)) {
    return "et";
  }
  return "en";
}

function getSupportMessage(key, locale) {
  const resolvedLocale = locale === "en" ? "en" : "et";
  const bundle = SUPPORT_MESSAGES[resolvedLocale] || SUPPORT_MESSAGES.et;
  return bundle[key] || bundle.general;
}

function buildSupportContext(intent, locale) {
  if (intent === "support_shipping") return getSupportMessage("shipping", locale);
  if (intent === "support_returns") return getSupportMessage("returns", locale);
  if (intent === "support_payment") return getSupportMessage("payment", locale);
  if (intent === "support_contact") return getSupportMessage("contact", locale);
  if (intent === "support_order") return getSupportMessage("order", locale);
  if (intent === "escalation") return getSupportMessage("escalation", locale);
  if (intent === "smalltalk") return getSupportMessage("smalltalk", locale);
  return getSupportMessage("general", locale);
}

module.exports = {
  ANTHROPIC_SYSTEM_PROMPT,
  CONTACT,
  LINKS,
  STORE_KNOWLEDGE,
  buildSupportContext,
  detectLocale,
  getSupportMessage,
};
