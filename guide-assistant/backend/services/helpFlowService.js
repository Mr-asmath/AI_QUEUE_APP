import { getHelpFlow } from "./knowledgeBaseService.js";

export function formatHelpFlow(intent) {
  const flow = getHelpFlow(intent);
  if (!flow) return null;

  const steps = flow.steps.map((step, index) => `Step ${index + 1}: ${step}`);
  return {
    ...flow,
    formattedSteps: steps,
    fullText: `Follow these steps:\n\n${steps.join("\n")}\n\nDo you need the next step or additional help?`
  };
}

export function getNextStep(intent, currentIndex = 0) {
  const flow = getHelpFlow(intent);
  if (!flow) return null;

  const nextIndex = Math.min(currentIndex + 1, flow.steps.length - 1);
  return {
    stepIndex: nextIndex,
    text: `Step ${nextIndex + 1}: ${flow.steps[nextIndex]}`
  };
}
