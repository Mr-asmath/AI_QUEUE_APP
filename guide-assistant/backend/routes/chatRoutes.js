import { Router } from "express";
import { randomUUID } from "crypto";
import { detectIntent } from "../services/intentDetectionService.js";
import { buildResponse } from "../services/responseService.js";
import { getSuggestions, getFaq, getHelpFlow } from "../services/knowledgeBaseService.js";
import { getSession, updateSession } from "../services/sessionService.js";
import { recordFeedback, recordMessage, getAnalytics } from "../services/analyticsService.js";

const router = Router();

router.post("/message", (req, res) => {
  const message = String(req.body?.message || "").trim();
  const sessionId = req.body?.sessionId || randomUUID();

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const session = getSession(sessionId);
  const detected = detectIntent(message, session);
  const response = buildResponse({ message, detected, session });
  const updatedSession = updateSession(sessionId, {
    lastUserMessage: message,
    lastBotMessage: response.text,
    currentIntent: response.intent || session.currentIntent,
    lastStepIndex: response.stepIndex ?? session.lastStepIndex ?? 0
  });

  recordMessage({ message, intent: response.intent, success: Boolean(response.intent), sessionId });

  res.json({
    sessionId,
    messageId: randomUUID(),
    timestamp: new Date().toISOString(),
    detectedIntent: detected,
    response,
    session: {
      currentIntent: updatedSession.currentIntent,
      lastStepIndex: updatedSession.lastStepIndex
    }
  });
});

router.get("/suggestions", (_req, res) => {
  res.json({ suggestions: getSuggestions() });
});

router.get("/help-flow/:intent", (req, res) => {
  const flow = getHelpFlow(req.params.intent);
  if (!flow) {
    return res.status(404).json({ error: "Help flow not found" });
  }
  res.json({ intent: req.params.intent, flow });
});

router.get("/faq", (_req, res) => {
  res.json({ faq: getFaq() });
});

router.post("/feedback", (req, res) => {
  const feedback = {
    sessionId: req.body?.sessionId,
    rating: req.body?.rating,
    comment: req.body?.comment,
    intent: req.body?.intent
  };
  recordFeedback(feedback);
  res.status(201).json({ status: "received", feedback });
});

router.get("/analytics", (_req, res) => {
  res.json(getAnalytics());
});

export default router;
