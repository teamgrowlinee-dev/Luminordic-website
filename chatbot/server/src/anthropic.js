const API_URL =
  process.env.ANTHROPIC_API_URL || "https://api.anthropic.com/v1/messages";
const API_VERSION = process.env.ANTHROPIC_VERSION || "2023-06-01";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const MAX_TOKENS = Math.max(
  64,
  Number(process.env.ANTHROPIC_MAX_TOKENS || 320)
);

function hasAnthropic() {
  return !!String(process.env.ANTHROPIC_API_KEY || "").trim();
}

async function callAnthropic(options) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    return null;
  }

  const payload = {
    model: String((options && options.model) || MODEL),
    max_tokens: Number((options && options.maxTokens) || MAX_TOKENS),
    temperature: Number((options && options.temperature) || 0),
    system: String((options && options.systemPrompt) || "").trim(),
    messages: [
      {
        role: "user",
        content: String((options && options.userPrompt) || "").trim(),
      },
    ],
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": API_VERSION,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const json = await response.json();
  const blocks = Array.isArray(json.content) ? json.content : [];
  const text = blocks
    .map((block) => (block && block.type === "text" ? block.text : ""))
    .join("")
    .trim();

  return text || null;
}

module.exports = {
  MODEL,
  callAnthropic,
  hasAnthropic,
};
