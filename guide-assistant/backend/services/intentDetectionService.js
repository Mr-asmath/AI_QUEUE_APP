import { getFaq, getIntents } from "./knowledgeBaseService.js";

const followUpMap = {
  "next step": "next_step",
  next: "next_step",
  repeat: "repeat",
  "more details": "more_details",
  details: "more_details",
  support: "contact_support",
  "contact support": "contact_support"
};

function normalize(value) {
  return value.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreKeyword(message, keyword) {
  const normalizedMessage = normalize(message);
  const normalizedKeyword = normalize(keyword);

  if (normalizedMessage === normalizedKeyword) return 100;
  if (normalizedMessage.includes(normalizedKeyword)) return 60 + normalizedKeyword.length;

  const keywordWords = normalizedKeyword.split(" ");
  const matchedWords = keywordWords.filter((word) => normalizedMessage.includes(word));
  return Math.round((matchedWords.length / keywordWords.length) * 40);
}

export function detectIntent(message, session = {}) {
  const normalizedMessage = normalize(message);
  const followUp = Object.entries(followUpMap).find(([phrase]) => normalizedMessage.includes(phrase));

  if (followUp && session.currentIntent) {
    return {
      intent: session.currentIntent,
      confidence: 0.92,
      type: followUp[1],
      source: "conversation_memory"
    };
  }

  const intents = getIntents();
  const faq = getFaq();
  const candidates = intents.map((intent) => {
    const faqAliases = faq
      .filter((item) => item.intent === intent.id)
      .flatMap((item) => [item.question, ...(item.aliases || [])]);
    const phrases = [...intent.keywords, ...faqAliases];
    const bestScore = Math.max(...phrases.map((phrase) => scoreKeyword(message, phrase)));
    return { intent: intent.id, label: intent.label, score: bestScore };
  });

  const best = candidates.sort((a, b) => b.score - a.score)[0];

  if (best?.score >= 35) {
    return {
      intent: best.intent,
      label: best.label,
      confidence: Math.min(0.98, Number((best.score / 100).toFixed(2))),
      type: "intent",
      source: "local_keywords"
    };
  }

  if (session.currentIntent && normalizedMessage.length < 40) {
    return {
      intent: session.currentIntent,
      confidence: 0.62,
      type: "contextual_followup",
      source: "conversation_memory"
    };
  }

  return {
    intent: null,
    confidence: 0,
    type: "fallback",
    source: "fallback"
  };
}
