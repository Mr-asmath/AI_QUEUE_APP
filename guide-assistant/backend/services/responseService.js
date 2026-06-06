import { formatHelpFlow, getNextStep } from "./helpFlowService.js";
import { getHelpFlow } from "./knowledgeBaseService.js";

const followUps = ["Next Step", "Repeat", "More Details", "Contact Support"];

function fallbackResponse() {
  return {
    intent: null,
    text: "What would you like help with? You can ask about tokens, queues, counters, branches, analytics, TV display setup, login, feedback, or support.",
    steps: [],
    followUps,
    tone: "clarifying"
  };
}

export function buildResponse({ detected, session }) {
  const intent = detected.intent;

  if (!intent) {
    return fallbackResponse();
  }

  if (detected.type === "next_step") {
    const nextStep = getNextStep(intent, session.lastStepIndex ?? 0);
    return {
      intent,
      text: nextStep?.text || "There are no more steps in this flow. Would you like more details or support?",
      steps: nextStep ? [nextStep.text] : [],
      followUps,
      stepIndex: nextStep?.stepIndex ?? session.lastStepIndex ?? 0,
      tone: "guided"
    };
  }

  if (detected.type === "repeat") {
    const flow = formatHelpFlow(intent);
    return {
      intent,
      text: flow?.fullText || "I can repeat the previous guidance. What topic should I repeat?",
      steps: flow?.formattedSteps || [],
      followUps,
      stepIndex: 0,
      tone: "repeat"
    };
  }

  if (detected.type === "more_details") {
    const flow = getHelpFlow(intent);
    return {
      intent,
      text: flow?.details || "I can share more details when that guide is available.",
      steps: [],
      followUps,
      stepIndex: session.lastStepIndex ?? 0,
      tone: "details"
    };
  }

  if (detected.type === "contact_support" || intent === "support") {
    const flow = formatHelpFlow("support");
    return {
      intent: "support",
      text: flow.fullText,
      steps: flow.formattedSteps,
      followUps,
      stepIndex: 0,
      tone: "support"
    };
  }

  const flow = formatHelpFlow(intent);
  if (!flow) {
    return fallbackResponse();
  }

  return {
    intent,
    title: flow.title,
    text: flow.fullText,
    steps: flow.formattedSteps,
    followUps,
    stepIndex: 0,
    tone: "guided"
  };
}
