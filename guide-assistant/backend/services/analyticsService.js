const analytics = {
  totalConversations: 0,
  totalMessages: 0,
  successfulResponses: 0,
  questions: new Map(),
  intentUsage: new Map(),
  feedback: []
};

const knownSessions = new Set();

export function recordMessage({ message, intent, success, sessionId }) {
  analytics.totalMessages += 1;

  if (sessionId && !knownSessions.has(sessionId)) {
    knownSessions.add(sessionId);
    analytics.totalConversations += 1;
  }

  if (success) analytics.successfulResponses += 1;

  const key = message.toLowerCase().trim();
  analytics.questions.set(key, (analytics.questions.get(key) || 0) + 1);

  if (intent) {
    analytics.intentUsage.set(intent, (analytics.intentUsage.get(intent) || 0) + 1);
  }
}

export function recordFeedback(feedback) {
  analytics.feedback.push({
    ...feedback,
    createdAt: new Date().toISOString()
  });
}

function topEntries(map, limit = 10) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

export function getAnalytics() {
  const responseSuccessRate = analytics.totalMessages
    ? Number((analytics.successfulResponses / analytics.totalMessages).toFixed(2))
    : 0;

  return {
    totalConversations: Math.max(analytics.totalConversations, 1),
    totalMessages: analytics.totalMessages,
    mostCommonQuestions: topEntries(analytics.questions),
    intentUsage: topEntries(analytics.intentUsage),
    responseSuccessRate,
    feedbackCount: analytics.feedback.length,
    feedback: analytics.feedback.slice(-20)
  };
}
