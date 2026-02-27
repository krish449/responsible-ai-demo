// ─────────────────────────────────────────────────────────────────────────────
// UC-08: Engineering Chatbot Route
// Multi-turn chat with irresponsible vs responsible paths.
// The responsible path adds: system prompt, injection guard, source tagging,
// destructive action gating, and session audit logging.
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { groqClient, PRIMARY_MODEL, isApiKeyValid, API_KEY_SETUP_MESSAGE } from "../config/groq";
import { getScenario } from "../scenarios";
import { checkInjection, getDeflectionMessage } from "../services/injectionGuard";
import { auditLog } from "../services/auditLog";

export const chatRouter = Router();

// In-memory session store — for demo only (no persistence)
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatSession {
  id: string;
  mode: "irresponsible" | "responsible";
  messages: ChatMessage[];
  createdAt: string;
  turnCount: number;
}

const sessions = new Map<string, ChatSession>();

// Destructive command patterns — trigger scoping flow on responsible path
const DESTRUCTIVE_PATTERNS = [
  /\b(rm|remove|delete|drop|truncate|destroy|wipe|purge)\b/i,
  /\b(force.push|git.push.*force|--force)\b/i,
  /\b(chmod\s+777|chmod\s+a\+[wx])\b/i,
];

function isDestructiveCommand(message: string): boolean {
  return DESTRUCTIVE_PATTERNS.some((p) => p.test(message));
}

// GET /api/chat/sessions/:sessionId — get session history
chatRouter.get("/sessions/:sessionId", (req: Request, res: Response) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  // Don't expose system prompt in response
  const publicMessages = session.messages.filter((m) => m.role !== "system");
  res.json({ session: { ...session, messages: publicMessages } });
});

// POST /api/chat/sessions — create new session
chatRouter.post("/sessions", (req: Request, res: Response) => {
  const { mode } = req.body as { mode: "irresponsible" | "responsible" };
  if (!mode) return res.status(400).json({ error: "mode is required" });

  const sessionId = uuidv4();
  const scenario = getScenario("uc08");
  const systemPrompt = mode === "responsible" && scenario
    ? scenario.responsible.systemPrompt
    : undefined;

  const session: ChatSession = {
    id: sessionId,
    mode,
    messages: systemPrompt ? [{ role: "system", content: systemPrompt }] : [],
    createdAt: new Date().toISOString(),
    turnCount: 0,
  };

  sessions.set(sessionId, session);
  res.json({ sessionId, mode });
});

// POST /api/chat/sessions/:sessionId/message — send message, stream response
chatRouter.post("/sessions/:sessionId/message", async (req: Request, res: Response) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const { message } = req.body as { message: string };
  if (!message?.trim()) return res.status(400).json({ error: "message is required" });

  const startTime = Date.now();
  let guardrailsTriggered: string[] = [];
  let injectionDetected = false;
  let deflected = false;
  let destructiveWarning = false;

  // ── Responsible path guardrails (run BEFORE API key check — regex only, no LLM) ──
  if (session.mode === "responsible") {
    // 1. Injection check — pure regex, works without an API key
    const injectionResult = checkInjection(message);
    if (injectionResult.isInjection) {
      injectionDetected = true;
      guardrailsTriggered.push("injection-defense");

      // Log the attempt, then respond with deflection (don't send to LLM)
      auditLog.add({
        scenarioId: "uc08",
        scenarioTitle: "Engineering Assistant Chatbot",
        verdict: "RESPONSIBLE",
        promptSummary: `[INJECTION ATTEMPT] ${message.substring(0, 100)}`,
        responseSummary: "Deflected — prompt injection detected",
        guardrailsTriggered,
        injectionDetected: true,
        piiRedacted: false,
        piiCategories: [],
        humanReviewRequired: false,
        durationMs: Date.now() - startTime,
        modelUsed: "DEFLECTED",
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const deflectionMsg = getDeflectionMessage();
      res.write(`data: ${JSON.stringify({ type: "metadata", guardrailsTriggered, injectionDetected: true, deflected: true })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "delta", content: deflectionMsg })}\n\n`);

      // Add deflection to session history (don't add the injected user message)
      session.messages.push({ role: "assistant", content: deflectionMsg });
      session.turnCount++;

      res.write(`data: ${JSON.stringify({ type: "done", durationMs: Date.now() - startTime })}\n\n`);
      res.end();
      deflected = true;
      return;
    }

    // 2. Destructive command check — add safety preamble to system context
    if (isDestructiveCommand(message)) {
      destructiveWarning = true;
      guardrailsTriggered.push("destructive-gate");
    }
  }

  // ── Pre-flight: API key check (only required for actual LLM call below) ──────
  if (!isApiKeyValid()) {
    return res.status(503).json({ error: API_KEY_SETUP_MESSAGE });
  }

  // ── Add user message to history ──────────────────────────────────────────────
  session.messages.push({ role: "user", content: message });

  // ── Build API messages ────────────────────────────────────────────────────────
  // For irresponsible: no system prompt, raw messages
  // For responsible: system prompt already in messages[0]
  const apiMessages = session.messages.map((m) => ({
    role: m.role as "system" | "user" | "assistant",
    content: m.content,
  }));

  // ── Stream SSE ────────────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.write(`data: ${JSON.stringify({
    type: "metadata",
    guardrailsTriggered,
    injectionDetected,
    destructiveWarning,
    mode: session.mode,
  })}\n\n`);

  let fullResponse = "";

  try {
    const stream = await groqClient.chat.completions.create({
      messages: apiMessages,
      model: PRIMARY_MODEL,
      temperature: session.mode === "irresponsible" ? 0.8 : 0.2,
      max_tokens: 1024,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`);
      }
    }

    // ── Append assistant response to session ────────────────────────────────────
    session.messages.push({ role: "assistant", content: fullResponse });
    session.turnCount++;

    // ── Audit log ──────────────────────────────────────────────────────────────
    const durationMs = Date.now() - startTime;
    auditLog.add({
      scenarioId: "uc08",
      scenarioTitle: "Engineering Assistant Chatbot",
      verdict: session.mode === "irresponsible" ? "IRRESPONSIBLE" : "RESPONSIBLE",
      promptSummary: message.substring(0, 120),
      responseSummary: fullResponse.substring(0, 120) + (fullResponse.length > 120 ? "..." : ""),
      guardrailsTriggered,
      injectionDetected,
      piiRedacted: false,
      piiCategories: [],
      humanReviewRequired: destructiveWarning,
      durationMs,
      modelUsed: PRIMARY_MODEL,
    });

    res.write(`data: ${JSON.stringify({ type: "done", durationMs, turnCount: session.turnCount })}\n\n`);
    res.end();
  } catch (err: unknown) {
    let errorMessage = err instanceof Error ? err.message : "Unknown error";
    const status = (err as { status?: number })?.status;
    if (status === 401 || errorMessage.toLowerCase().includes("invalid api key") || errorMessage.toLowerCase().includes("invalid_api_key")) {
      errorMessage = "GROQ_API_KEY not configured or invalid.\n\nTo fix:\n1. Copy .env.example → backend/.env\n2. Set GROQ_API_KEY=gsk_... (free at https://console.groq.com)\n3. Restart the backend server";
    }
    res.write(`data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`);
    res.end();
  }
});

// DELETE /api/chat/sessions/:sessionId — clear session (start over)
chatRouter.delete("/sessions/:sessionId", (req: Request, res: Response) => {
  if (sessions.delete(req.params.sessionId)) {
    res.json({ message: "Session cleared" });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});
