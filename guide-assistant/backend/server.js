import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createRequire } from "module";
import chatRoutes from "./routes/chatRoutes.js";

const require = createRequire(import.meta.url);
const helmet = require("helmet");

const app = express();
const port = process.env.PORT || 5050;
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ai-queue-guide-assistant" });
});

app.use("/api/chat", chatRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.path });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Unexpected server error" });
});

app.listen(port, () => {
  console.log(`AI Queue Guide Assistant backend running on http://localhost:${port}`);
});
