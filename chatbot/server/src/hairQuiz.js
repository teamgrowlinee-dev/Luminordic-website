const QUIZ_QUESTIONS = [
  {
    id: "scalp",
    prompt:
      "Kuidas su peanahk ja juured tavaliselt paari päeva jooksul pärast pesu käituvad?",
    options: [
      { value: "balanced", label: "Pigem tasakaalus" },
      { value: "dry", label: "Peanahk kipub kuivama või kiskuma" },
      { value: "oily", label: "Juured lähevad kiiresti rasuseks" },
      { value: "flaky", label: "Tekib sügelust, helbeid või tundlikkust" },
    ],
  },
  {
    id: "lengths",
    prompt: "Millised on su juuksepikkused ja otsad enamasti?",
    options: [
      { value: "balanced", label: "Siledad ja pigem probleemivabad" },
      { value: "dry", label: "Kuivad või tuhmid" },
      { value: "frizzy", label: "Kahused ja raskesti taltsutatavad" },
      { value: "damaged", label: "Kahjustatud või murdumisele kalduvad" },
    ],
  },
  {
    id: "pattern",
    prompt:
      "Milline on su juuste loomulik kuju siis, kui sa neid ei stiliseeri?",
    options: [
      { value: "straight", label: "Sirged" },
      { value: "wavy", label: "Lainelised" },
      { value: "curly", label: "Lokkis" },
      { value: "coily", label: "Väga lokkis" },
    ],
  },
  {
    id: "thickness",
    prompt: "Kuidas su juuksekarv üldiselt tundub?",
    options: [
      { value: "fine", label: "Pigem peen ja õrn" },
      { value: "medium", label: "Keskmine" },
      { value: "coarse", label: "Pigem tugev või paksem" },
    ],
  },
  {
    id: "processing",
    prompt: "Kui palju saavad su juuksed värvi- või kuumakahjustust?",
    options: [
      { value: "minimal", label: "Vähe, pigem loomulik hooldus" },
      { value: "color", label: "Värvin või toonin aeg-ajalt" },
      { value: "heat", label: "Kasutan sageli fööni, sirgendajat või lokitange" },
      { value: "bleached", label: "Juuksed on blondeeritud või tuntavalt kahjustatud" },
    ],
  },
];

function getQuestionMap() {
  return QUIZ_QUESTIONS.reduce((map, question) => {
    map[question.id] = question;
    return map;
  }, {});
}

function getPublicHairQuizQuestions() {
  return QUIZ_QUESTIONS.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  }));
}

function normalizeHairQuizAnswers(input) {
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

function getHairAnswerEntries(answers) {
  const normalized = normalizeHairQuizAnswers(answers);
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
  getPublicHairQuizQuestions,
  normalizeHairQuizAnswers,
  getHairAnswerEntries,
};
