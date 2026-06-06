import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = process.env.GUIDE_DATA_DIR
  ? path.resolve(process.env.GUIDE_DATA_DIR)
  : path.resolve(__dirname, "../../data");

function readJson(fileName) {
  const filePath = path.join(dataDir, fileName);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function getIntents() {
  return readJson("intents.json");
}

export function getHelpFlows() {
  return readJson("helpFlows.json");
}

export function getFaq() {
  return readJson("faq.json");
}

export function getHelpFlow(intent) {
  return getHelpFlows()[intent] || null;
}

export function getSuggestions() {
  return getIntents().map((intent) => ({
    label: intent.label,
    intent: intent.id
  }));
}
