function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeSse(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function splitIntoChunks(text, size) {
  const value = String(text || "").trim();
  if (!value) return [];
  const words = value.split(/\s+/);
  const chunks = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > size && current) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

async function streamChatPayload(res, payload) {
  writeSse(res, "meta", { mode: payload.mode || "support" });

  const chunks = splitIntoChunks(payload.assistantText, 36);
  for (const chunk of chunks) {
    writeSse(res, "chunk", { text: chunk });
    await wait(18);
  }

  if (Array.isArray(payload.products) && payload.products.length) {
    writeSse(res, "products", { items: payload.products });
  }

  writeSse(res, "done", payload);
  res.end();
}

module.exports = {
  streamChatPayload,
  writeSse,
};
