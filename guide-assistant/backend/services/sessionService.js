const sessions = new Map();

export function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      createdAt: new Date().toISOString(),
      currentIntent: null,
      lastStepIndex: 0,
      messages: []
    });
  }
  return sessions.get(sessionId);
}

export function updateSession(sessionId, patch) {
  const session = getSession(sessionId);
  const updated = {
    ...session,
    ...patch,
    updatedAt: new Date().toISOString(),
    messages: [
      ...session.messages,
      {
        user: patch.lastUserMessage,
        bot: patch.lastBotMessage,
        intent: patch.currentIntent,
        timestamp: new Date().toISOString()
      }
    ].slice(-30)
  };
  sessions.set(sessionId, updated);
  return updated;
}
