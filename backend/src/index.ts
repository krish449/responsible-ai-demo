import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { scenariosRouter } from "./routes/scenarios";
import { chatRouter } from "./routes/chat";
import { authRouter } from "./routes/auth";
import { quizRouter } from "./routes/quiz";
import { adminRouter } from "./routes/admin";
import { requireAuth } from "./middleware/auth";
import { initDB } from "./db/database";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === "production";

// ── CORS — allow localhost in dev, FRONTEND_URL in prod ───────────────────────
const allowedOrigins = ["http://localhost:5173", "http://localhost:3000"];
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);

app.use(cors({ origin: IS_PROD ? allowedOrigins : true }));
app.use(express.json({ limit: "1mb" }));

// ── Public routes (no auth required) ─────────────────────────────────────────
app.use("/api/auth", authRouter);

// ── Protected routes ──────────────────────────────────────────────────────────
app.use("/api/scenarios", requireAuth, scenariosRouter);
app.use("/api/chat", requireAuth, chatRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/admin", adminRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    description: "Responsible AI Demo API",
  });
});

// ── Serve frontend in production ──────────────────────────────────────────────
if (IS_PROD) {
  const frontendDist = path.join(__dirname, "../../frontend/dist");
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }
}

// ── Start server ──────────────────────────────────────────────────────────────
async function main() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`\n🛡️  Responsible AI Demo Backend`);
    console.log(`   Running on http://localhost:${PORT}`);
    console.log(`   API Health: http://localhost:${PORT}/api/health\n`);
  });
}

main().catch(console.error);

export default app;
