const cors = require("cors");
const express = require("express");
const path = require("path");

const { hasAnthropic } = require("./src/anthropic");
const { buildChatResponse } = require("./src/chatService");
const { getPublicHairQuizQuestions } = require("./src/hairQuiz");
const { buildHairProfileResponse } = require("./src/hairProfileService");
const { getPublicSkinQuizQuestions } = require("./src/skinQuiz");
const { buildSkinProfileResponse } = require("./src/skinProfileService");
const { streamChatPayload, writeSse } = require("./src/streaming");

const app = express();
const PORT = process.env.PORT || 3001;
const WIDGET_VERSION = "1.0.0";
const RENDER_URL =
  process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
const STORE_BASE_URL = (
  process.env.STORE_BASE_URL || "https://www.luminordic.com"
).replace(/\/+$/, "");
const widgetDir = path.join(__dirname, "..", "widget");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "luminordic-chatbot",
    version: WIDGET_VERSION,
    anthropicEnabled: hasAnthropic(),
  });
});

app.use("/widget", express.static(widgetDir, { maxAge: "1h" }));

app.get(["/", "/demo"], (_req, res) => {
  res.sendFile(path.join(widgetDir, "demo.html"));
});

app.get("/widget/loader.js", (_req, res) => {
  const loader = `(function () {
  var existing =
    window.LUMINORDIC_CHATBOT_CONFIG ||
    window.BIOSKINA_CHATBOT_CONFIG ||
    {};
  var version = Date.now();
  window.LUMINORDIC_CHATBOT_CONFIG = Object.assign(
    {
      apiBase: "${RENDER_URL}",
      storeBaseUrl: "${STORE_BASE_URL}",
      title: "LUMI assistent",
      launcherLabel: "Küsi toodete või klienditoe kohta",
      tooltipTitle: "Tere!",
      tooltipText: "Tee juuksetüübi või nahatüübi test või küsi LUMI tootesoovitust.",
      welcomeMessage: "Tere! Olen LUMI assistent. Aitan sul teha juuksetüübi ja nahatüübi testi, leida sobivaid tooteid ning vastan klienditoe küsimustele.",
      exampleMessage: "Kui soovid, võid kirjutada tooteküsimuse või küsida tarne kohta. Kiirvalikuna saad kohe teha ka juuksetüübi ja nahatüübi testi.",
      poweredByUrl: "https://growlinee.com/ee",
      poweredByLabel: "Powered by Growlinee",
      vendor: "growlinee",
      widgetVersion: "v${WIDGET_VERSION}"
    },
    existing
  );

  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "${RENDER_URL}/widget/luminordic-widget.css?v=" + version;
  document.head.appendChild(link);

  var script = document.createElement("script");
  script.src = "${RENDER_URL}/widget/luminordic-widget.js?v=" + version;
  script.defer = true;
  document.head.appendChild(script);
})();`;

  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-cache, no-store");
  res.send(loader);
});

app.get("/api/hair-quiz", (_req, res) => {
  res.json({
    ok: true,
    type: "hair",
    questions: getPublicHairQuizQuestions(),
  });
});

app.post("/api/hair-profile", async (req, res) => {
  try {
    const answers = req.body && req.body.answers;
    const payload = await buildHairProfileResponse(answers);
    return res.json({ ok: true, ...payload });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  }
});

app.get("/api/skin-quiz", (_req, res) => {
  res.json({
    ok: true,
    type: "skin",
    questions: getPublicSkinQuizQuestions(),
  });
});

app.post("/api/skin-profile", async (req, res) => {
  try {
    const answers = req.body && req.body.answers;
    const payload = await buildSkinProfileResponse(answers);
    return res.json({ ok: true, ...payload });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String((req.body && req.body.message) || "").trim();
    if (!message) {
      return res.status(400).json({ ok: false, error: "Missing message" });
    }

    const payload = await buildChatResponse(message);
    return res.json({ ok: true, ...payload });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  }
});

app.post("/api/chat/stream", async (req, res) => {
  const message = String((req.body && req.body.message) || "").trim();
  if (!message) {
    return res.status(400).json({ ok: false, error: "Missing message" });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const payload = await buildChatResponse(message);
    await streamChatPayload(res, { ok: true, ...payload });
  } catch (error) {
    writeSse(res, "error", {
      message: String(error && error.message ? error.message : error),
    });
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Luminordic chatbot server running on port ${PORT}`);
  console.log(`Demo:       ${RENDER_URL}/demo`);
  console.log(`Loader:     ${RENDER_URL}/widget/loader.js`);
  console.log(`Widget JS:  ${RENDER_URL}/widget/luminordic-widget.js`);
  console.log(`Widget CSS: ${RENDER_URL}/widget/luminordic-widget.css`);
});
