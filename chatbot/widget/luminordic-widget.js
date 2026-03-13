(function () {
  if (window.__luminordicChatbotLoaded) return;
  window.__luminordicChatbotLoaded = true;

  var config = Object.assign(
    {
      apiBase: window.location.origin,
      storeBaseUrl: "https://www.luminordic.com",
      title: "LUMI assistent",
      brandName: "LUMI",
      launcherLabel: "Küsi toodete või klienditoe kohta",
      tooltipTitle: "Tere!",
      tooltipText:
        "Tee juuksetüübi või nahatüübi test või küsi LUMI tootesoovitust.",
      welcomeMessage:
        "Tere! Olen LUMI assistent. Aitan sul teha juuksetüübi ja nahatüübi testi, leida sobivaid tooteid ning vastan klienditoe küsimustele.",
      exampleMessage:
        "Kui soovid, võid kirjutada tooteküsimuse või küsida tarne kohta. Kiirvalikuna saad kohe teha ka juuksetüübi või nahatüübi testi.",
      poweredByUrl: "https://growlinee.com/ee",
      poweredByLabel: "Powered by Growlinee",
    },
    window.LUMINORDIC_CHATBOT_CONFIG ||
      window.BIOSKINA_CHATBOT_CONFIG ||
      {}
  );

  var QUIZ_META = {
    hair: {
      label: "Juuksetüübi test",
      intro:
        "Alustame juuksetüübi testiga. Vali igale küsimusele endale kõige sobivam variant.",
      endpoint: "/api/hair-quiz",
      resultEndpoint: "/api/hair-profile",
      progressLabel: "Juuksetüübi test",
      loadingLabel:
        "Aitäh! Panen su vastused kokku ja valin nende põhjal sobivad juuksetooted.",
      errorLabel: "Juuksetüübi test ei ole praegu saadaval.",
    },
    skin: {
      label: "Nahatüübi test",
      intro:
        "Alustame nahatüübi testiga. Vali igale küsimusele endale kõige sobivam variant.",
      endpoint: "/api/skin-quiz",
      resultEndpoint: "/api/skin-profile",
      progressLabel: "Nahatüübi test",
      loadingLabel:
        "Aitäh! Panen su vastused kokku ja valin nende põhjal sobivad nahahooldustooted.",
      errorLabel: "Nahatüübi test ei ole praegu saadaval.",
    },
  };

  var defaultActions = [
    { label: "Juuksetüübi test", kind: "quiz-start", quizType: "hair" },
    { label: "Nahatüübi test", kind: "quiz-start", quizType: "skin" },
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMessageHtml(value) {
    var html = escapeHtml(value || "");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    html = html.replace(/\n/g, "<br>");
    return html;
  }

  function formatPrice(product) {
    if (!product || typeof product.price !== "number" || !product.price) return "";
    return product.price.toFixed(2).replace(".00", "") + " " + (product.currency || "EUR");
  }

  function createElement(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  var root = createElement("div", "bio-chatbot");
  var fabWrap = createElement("div", "bio-chatbot__fab-wrap");
  var tooltip = createElement(
    "button",
    "bio-chatbot__tooltip",
    '<span class="bio-chatbot__tooltip-title">' +
      escapeHtml(config.tooltipTitle) +
      '</span><span class="bio-chatbot__tooltip-body">' +
      escapeHtml(config.tooltipText) +
      "</span>"
  );
  tooltip.type = "button";
  tooltip.setAttribute("aria-label", config.launcherLabel);

  var launcher = createElement(
    "button",
    "bio-chatbot__launcher",
    '<span aria-hidden="true">💬</span><span class="bio-chatbot__sr-only">' +
      escapeHtml(config.launcherLabel) +
      "</span>"
  );
  launcher.type = "button";
  launcher.setAttribute("aria-label", config.launcherLabel);

  var panel = createElement("section", "bio-chatbot__panel bio-chatbot__panel--hidden");
  panel.setAttribute("aria-live", "polite");

  var header = createElement(
    "header",
    "bio-chatbot__header",
    '<div class="bio-chatbot__brand">' +
      '<div class="bio-chatbot__brand-icon"><span class="bio-chatbot__brand-emoji" aria-hidden="true">💬</span></div>' +
      '<div class="bio-chatbot__brand-copy">' +
      '<p class="bio-chatbot__eyebrow">LUMI · Tooted ja klienditugi</p>' +
      "<h2>" +
      escapeHtml(config.title) +
      "</h2>" +
      '<a class="bio-chatbot__powered" href="' +
      escapeHtml(config.poweredByUrl) +
      '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(config.poweredByLabel) +
      "</a>" +
      "</div></div>" +
      '<button type="button" class="bio-chatbot__close" aria-label="Sulge">×</button>'
  );

  var messages = createElement("div", "bio-chatbot__messages");
  var chips = createElement("div", "bio-chatbot__chips bio-chatbot__chips--hidden");
  var composer = createElement(
    "form",
    "bio-chatbot__composer",
    '<textarea class="bio-chatbot__input" rows="1" placeholder="Küsi toodete või klienditoe kohta!"></textarea>' +
      '<button class="bio-chatbot__send" type="submit">Saada</button>'
  );

  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(chips);
  panel.appendChild(composer);

  fabWrap.appendChild(tooltip);
  fabWrap.appendChild(launcher);

  root.appendChild(panel);
  root.appendChild(fabWrap);
  document.body.appendChild(root);

  var closeButton = header.querySelector(".bio-chatbot__close");
  var input = composer.querySelector(".bio-chatbot__input");
  var sendButton = composer.querySelector(".bio-chatbot__send");

  var isBusy = false;
  var initialized = false;
  var quizState = null;
  var guidedOptionsNode = null;
  var quizCache = {
    hair: null,
    skin: null,
  };
  var quizPromises = {
    hair: null,
    skin: null,
  };

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function resizeComposer() {
    input.style.height = "0px";
    var nextHeight = Math.min(input.scrollHeight, 112);
    input.style.height = Math.max(nextHeight, 48) + "px";
  }

  function refreshComposerAvailability() {
    var guidedModeActive = !!quizState;
    input.disabled = isBusy || guidedModeActive;
    sendButton.disabled = isBusy || guidedModeActive;
    sendButton.textContent = isBusy ? "..." : "Saada";
    input.placeholder = guidedModeActive
      ? "Vali vastus allolevatest variantidest"
      : "Küsi toodete või klienditoe kohta!";
  }

  function setPanelOpen(nextOpen) {
    panel.classList.toggle("bio-chatbot__panel--hidden", !nextOpen);
    fabWrap.classList.toggle("bio-chatbot__fab-wrap--hidden", !!nextOpen);
    if (nextOpen) {
      ensureWelcomeMessages();
      window.setTimeout(function () {
        resizeComposer();
        if (!input.disabled) {
          input.focus();
        }
        scrollToBottom();
      }, 80);
    }
  }

  function appendMessage(role, html) {
    var wrapper = createElement(
      "article",
      "bio-chatbot__message bio-chatbot__message--" + role
    );
    var bubble = createElement("div", "bio-chatbot__bubble", html);
    wrapper.appendChild(bubble);
    messages.appendChild(wrapper);
    scrollToBottom();
    return {
      wrapper: wrapper,
      bubble: bubble,
      text: "",
    };
  }

  function appendBubble(role, text) {
    return appendMessage(role, formatMessageHtml(text));
  }

  function appendTyping() {
    var wrapper = createElement(
      "article",
      "bio-chatbot__message bio-chatbot__message--assistant"
    );
    var typing = createElement(
      "div",
      "bio-chatbot__typing",
      '<span class="bio-chatbot__typing-dot"></span>' +
        '<span class="bio-chatbot__typing-dot"></span>' +
        '<span class="bio-chatbot__typing-dot"></span>'
    );
    wrapper.appendChild(typing);
    messages.appendChild(wrapper);
    scrollToBottom();
    return {
      wrapper: wrapper,
      bubble: null,
      text: "",
    };
  }

  function setAssistantText(node, text) {
    node.text = String(text || "");
    if (!node.bubble) {
      node.wrapper.innerHTML = "";
      node.bubble = createElement("div", "bio-chatbot__bubble");
      node.wrapper.appendChild(node.bubble);
    }
    node.bubble.innerHTML = formatMessageHtml(node.text);
    scrollToBottom();
  }

  function disableGuidedOptions(selectedButton) {
    if (!guidedOptionsNode) return;

    var buttons = guidedOptionsNode.querySelectorAll(".bio-chatbot__option-button");
    buttons.forEach(function (button) {
      button.disabled = true;
      button.classList.add("bio-chatbot__option-button--disabled");
    });

    if (selectedButton) {
      selectedButton.classList.remove("bio-chatbot__option-button--disabled");
      selectedButton.classList.add("bio-chatbot__option-button--selected");
    }

    guidedOptionsNode = null;
  }

  function appendGuidedOptions(items) {
    disableGuidedOptions();

    var wrapper = createElement(
      "article",
      "bio-chatbot__message bio-chatbot__message--assistant bio-chatbot__message--options"
    );
    var optionList = createElement("div", "bio-chatbot__option-list");

    items.forEach(function (item) {
      var button = createElement(
        "button",
        "bio-chatbot__option-button",
        escapeHtml(item.label)
      );
      button.type = "button";
      button.title = item.label;
      button.addEventListener("click", function () {
        handleAction(item, button);
      });
      optionList.appendChild(button);
    });

    wrapper.appendChild(optionList);
    messages.appendChild(wrapper);
    guidedOptionsNode = optionList;
    scrollToBottom();
  }

  function setQuickActions(items) {
    chips.innerHTML = "";

    if (!Array.isArray(items) || !items.length) {
      chips.classList.add("bio-chatbot__chips--hidden");
      return;
    }

    var guidedOnly = items.every(function (item) {
      return item && item.kind === "quiz-option";
    });

    if (guidedOnly) {
      chips.classList.add("bio-chatbot__chips--hidden");
      appendGuidedOptions(items);
      return;
    }

    items.forEach(function (item) {
      var button = createElement(
        "button",
        "bio-chatbot__chip",
        escapeHtml(item.label)
      );
      button.type = "button";
      button.addEventListener("click", function () {
        handleAction(item, button);
      });
      chips.appendChild(button);
    });

    chips.classList.remove("bio-chatbot__chips--hidden");
  }

  function appendProducts(container, items) {
    if (!Array.isArray(items) || !items.length) return;

    var existingGrid = container.querySelector(".bio-chatbot__products");
    if (existingGrid) {
      existingGrid.remove();
    }

    var grid = createElement("div", "bio-chatbot__products");

    items.forEach(function (product) {
      var card = createElement("a", "bio-chatbot__product");
      card.href = product.url || config.storeBaseUrl;
      card.target = "_blank";
      card.rel = "noopener noreferrer";

      var image = product.imageUrl
        ? '<div class="bio-chatbot__product-image"><img src="' +
          escapeHtml(product.imageUrl) +
          '" alt="' +
          escapeHtml(product.name) +
          '"></div>'
        : '<div class="bio-chatbot__product-image bio-chatbot__product-image--empty"></div>';

      var role = product.recommendationRole
        ? '<p class="bio-chatbot__product-role">' +
          escapeHtml(product.recommendationRole) +
          "</p>"
        : "";

      var reason = product.recommendationReason
        ? '<p class="bio-chatbot__product-reason">' +
          escapeHtml(product.recommendationReason) +
          "</p>"
        : "";

      var description = product.description
        ? '<p class="bio-chatbot__product-description">' +
          escapeHtml(String(product.description).slice(0, 220)) +
          "</p>"
        : "";

      var price = formatPrice(product);

      card.innerHTML =
        image +
        '<div class="bio-chatbot__product-copy">' +
        role +
        "<h3>" +
        escapeHtml(product.name) +
        "</h3>" +
        (price
          ? '<p class="bio-chatbot__product-price">' + escapeHtml(price) + "</p>"
          : "") +
        description +
        reason +
        '<span class="bio-chatbot__product-cta">Ava toode</span>' +
        "</div>";

      grid.appendChild(card);
    });

    container.appendChild(grid);
    scrollToBottom();
  }

  function setBusy(nextBusy) {
    isBusy = !!nextBusy;
    refreshComposerAvailability();
  }

  function loadQuizQuestions(type) {
    if (quizCache[type]) {
      return Promise.resolve(quizCache[type]);
    }

    if (quizPromises[type]) {
      return quizPromises[type];
    }

    quizPromises[type] = fetch(config.apiBase + QUIZ_META[type].endpoint)
      .then(function (response) {
        if (!response.ok) {
          throw new Error(QUIZ_META[type].errorLabel);
        }
        return response.json();
      })
      .then(function (payload) {
        if (!payload.ok || !Array.isArray(payload.questions)) {
          throw new Error(payload.error || QUIZ_META[type].errorLabel);
        }
        quizCache[type] = payload.questions;
        return quizCache[type];
      })
      .finally(function () {
        quizPromises[type] = null;
      });

    return quizPromises[type];
  }

  function askCurrentQuizQuestion() {
    if (!quizState) return;

    var question = quizState.questions[quizState.index];
    if (!question) return;

    appendBubble(
      "assistant",
      "**" +
        QUIZ_META[quizState.type].progressLabel +
        " " +
        (quizState.index + 1) +
        "/" +
        quizState.questions.length +
        "**\n" +
        question.prompt
    );

    setQuickActions(
      question.options.map(function (option) {
        return {
          label: option.label,
          kind: "quiz-option",
          value: option.value,
        };
      })
    );
  }

  function finishQuiz() {
    if (!quizState) return;

    var quizType = quizState.type;
    var answers = Object.assign({}, quizState.answers);
    quizState = null;
    refreshComposerAvailability();
    setQuickActions([]);

    var assistantNode = appendTyping();
    setBusy(true);

    fetch(config.apiBase + QUIZ_META[quizType].resultEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ answers: answers }),
    })
      .then(function (response) {
        return response.json().then(function (payload) {
          if (!response.ok || !payload.ok) {
            throw new Error(
              payload.error ||
                QUIZ_META[quizType].errorLabel
            );
          }
          return payload;
        });
      })
      .then(function (payload) {
        setAssistantText(assistantNode, payload.assistantText || "");
        appendProducts(assistantNode.wrapper, payload.products || []);
        setQuickActions(defaultActions);
      })
      .catch(function (error) {
        setAssistantText(
          assistantNode,
          (error && error.message) || QUIZ_META[quizType].errorLabel
        );
        setQuickActions(defaultActions);
      })
      .finally(function () {
        setBusy(false);
        refreshComposerAvailability();
      });
  }

  function handleQuizAnswer(action, sourceButton) {
    if (!quizState) return;

    var question = quizState.questions[quizState.index];
    if (!question) return;

    var option = question.options.find(function (item) {
      return item.value === action.value;
    });
    if (!option) return;

    disableGuidedOptions(sourceButton);
    quizState.answers[question.id] = option.value;
    appendBubble("user", option.label);
    quizState.index += 1;

    if (quizState.index >= quizState.questions.length) {
      appendBubble("assistant", QUIZ_META[quizState.type].loadingLabel);
      finishQuiz();
      return;
    }

    askCurrentQuizQuestion();
  }

  function startQuiz(type) {
    if (!QUIZ_META[type]) return;

    setQuickActions([]);
    appendBubble("assistant", QUIZ_META[type].intro);
    setBusy(true);

    loadQuizQuestions(type)
      .then(function (questions) {
        quizState = {
          type: type,
          index: 0,
          answers: {},
          questions: questions,
        };
        refreshComposerAvailability();
        askCurrentQuizQuestion();
      })
      .catch(function (error) {
        appendBubble(
          "assistant",
          (error && error.message) || QUIZ_META[type].errorLabel
        );
        setQuickActions(defaultActions);
      })
      .finally(function () {
        setBusy(false);
        refreshComposerAvailability();
      });
  }

  function handleAction(action, sourceButton) {
    if (!action || isBusy) return;

    if (action.kind === "quiz-start") {
      startQuiz(action.quizType);
      return;
    }

    if (action.kind === "quiz-option") {
      handleQuizAnswer(action, sourceButton);
      return;
    }

    if (action.message) {
      sendMessage(action.message);
    }
  }

  function parseSseBlock(block) {
    var lines = String(block || "").split("\n");
    var eventName = "message";
    var data = "";

    lines.forEach(function (line) {
      if (line.indexOf("event:") === 0) {
        eventName = line.slice(6).trim();
      } else if (line.indexOf("data:") === 0) {
        data += line.slice(5).trim();
      }
    });

    if (!data) return null;

    try {
      return { event: eventName, payload: JSON.parse(data) };
    } catch (_error) {
      return null;
    }
  }

  async function streamChat(message, assistantNode) {
    var response = await fetch(config.apiBase + "/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message }),
    });

    if (!response.ok) {
      throw new Error("Päring ebaõnnestus.");
    }

    if (!response.body) {
      var fallback = await fetch(config.apiBase + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message }),
      });
      var fallbackJson = await fallback.json();
      if (!fallbackJson.ok) {
        throw new Error(fallbackJson.error || "Vastust ei saanud.");
      }
      setAssistantText(assistantNode, fallbackJson.assistantText || "");
      appendProducts(assistantNode.wrapper, fallbackJson.products || []);
      return;
    }

    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";

    while (true) {
      var step = await reader.read();
      if (step.done) break;

      buffer += decoder.decode(step.value, { stream: true });
      var parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      parts.forEach(function (part) {
        var parsed = parseSseBlock(part);
        if (!parsed) return;

        if (parsed.event === "chunk") {
          assistantNode.text = assistantNode.text
            ? assistantNode.text + " " + parsed.payload.text
            : parsed.payload.text;
          setAssistantText(assistantNode, assistantNode.text);
        } else if (parsed.event === "products") {
          appendProducts(assistantNode.wrapper, parsed.payload.items || []);
        } else if (parsed.event === "error") {
          throw new Error(parsed.payload.message || "Viga streamimisel.");
        }
      });
    }
  }

  function ensureWelcomeMessages() {
    if (initialized) return;
    appendBubble("assistant", config.welcomeMessage);
    appendBubble("assistant", config.exampleMessage);
    setQuickActions(defaultActions);
    initialized = true;
  }

  async function sendMessage(message) {
    var text = String(message || "").trim();
    if (!text || isBusy || quizState) return;

    ensureWelcomeMessages();
    appendBubble("user", text);
    var assistantNode = appendTyping();
    input.value = "";
    resizeComposer();
    setBusy(true);

    try {
      await streamChat(text, assistantNode);
      if (!assistantNode.text.trim()) {
        setAssistantText(assistantNode, "Vastust ei saadud.");
      }
    } catch (error) {
      setAssistantText(
        assistantNode,
        (error && error.message) || "Tekkis tundmatu viga."
      );
    } finally {
      setBusy(false);
      if (!quizState) {
        setQuickActions(defaultActions);
      }
      if (!input.disabled) {
        input.focus();
      }
      scrollToBottom();
    }
  }

  tooltip.addEventListener("click", function () {
    setPanelOpen(true);
  });

  launcher.addEventListener("click", function () {
    setPanelOpen(true);
  });

  closeButton.addEventListener("click", function () {
    setPanelOpen(false);
  });

  composer.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(input.value);
  });

  input.addEventListener("input", resizeComposer);
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input.value);
    }
  });

  resizeComposer();
  refreshComposerAvailability();
})();
