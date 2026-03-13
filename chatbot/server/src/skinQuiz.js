const QUIZ_QUESTIONS = [
  {
    id: "baseType",
    prompt: "Kuidas su näonahk tavaliselt paari tunni jooksul pärast puhastamist tundub?",
    options: [
      { value: "balanced", label: "Tasakaalus ja mugav" },
      { value: "dry", label: "Kiskuv, kuiv või kare" },
      { value: "oily", label: "Läikiv või rasune üle näo" },
      { value: "combination", label: "T-tsoon läigib, põsed on rahulikumad" },
    ],
  },
  {
    id: "sensitivity",
    prompt: "Kui tundlik või reaktsioonialdis su nahk on?",
    options: [
      { value: "low", label: "Pigem mitte tundlik" },
      { value: "medium", label: "Vahel tekib punetus või kipitus" },
      { value: "high", label: "Nahk ärritub kergesti ja on sageli tundlik" },
    ],
  },
  {
    id: "breakouts",
    prompt: "Kui tihti tekivad vistrikud, ummistused või laienenud poorid?",
    options: [
      { value: "rare", label: "Harva" },
      { value: "sometimes", label: "Aeg-ajalt" },
      { value: "often", label: "Üsna sageli" },
    ],
  },
  {
    id: "dehydration",
    prompt: "Kas nahk võib olla samaaegselt janune, tuhm või pingul?",
    options: [
      { value: "no", label: "Pigem ei" },
      { value: "sometimes", label: "Vahel küll" },
      { value: "yes", label: "Jah, üsna tihti" },
    ],
  },
  {
    id: "ageFocus",
    prompt: "Kas soovid rutiinis keskenduda ka kortsukeste, toonuse või elastsuse toetamisele?",
    options: [
      { value: "no", label: "See ei ole praegu peamine" },
      { value: "some", label: "Natuke jah" },
      { value: "yes", label: "Jah, see on oluline fookus" },
    ],
  },
  {
    id: "goal",
    prompt: "Mis on sinu peamine eesmärk praegu?",
    options: [
      { value: "hydrate", label: "Niisutus ja mugavustunne" },
      { value: "calm", label: "Punetuse ja tundlikkuse rahustamine" },
      { value: "clarify", label: "Puhastamine ja ebapuhtuste kontroll" },
      { value: "glow", label: "Ühtlasem jume ja sära" },
      { value: "protect", label: "Igapäevane kaitse ja SPF" },
      { value: "age", label: "Vananemisilmingute toetamine" },
    ],
  },
];

function getQuestionMap() {
  return QUIZ_QUESTIONS.reduce((map, question) => {
    map[question.id] = question;
    return map;
  }, {});
}

function getPublicSkinQuizQuestions() {
  return QUIZ_QUESTIONS.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  }));
}

function normalizeSkinQuizAnswers(input) {
  const answers = input && typeof input === "object" ? input : {};
  const questionMap = getQuestionMap();
  const normalized = {};

  for (const question of QUIZ_QUESTIONS) {
    const value = String(answers[question.id] || "").trim();
    const matched = questionMap[question.id].options.find(
      (option) => option.value === value
    );
    if (!matched) {
      throw new Error(`Missing or invalid answer for ${question.id}`);
    }
    normalized[question.id] = matched.value;
  }

  return normalized;
}

function getSkinAnswerEntries(answers) {
  const normalized = normalizeSkinQuizAnswers(answers);
  return QUIZ_QUESTIONS.map((question) => {
    const option = question.options.find(
      (item) => item.value === normalized[question.id]
    );
    return {
      id: question.id,
      prompt: question.prompt,
      value: normalized[question.id],
      label: option ? option.label : normalized[question.id],
    };
  });
}

module.exports = {
  QUIZ_QUESTIONS,
  getPublicSkinQuizQuestions,
  normalizeSkinQuizAnswers,
  getSkinAnswerEntries,
};
