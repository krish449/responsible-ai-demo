// ─────────────────────────────────────────────────────────────────────────────
// Scenarios Route — UC-01 through UC-07
// Handles irresponsible vs responsible prompt execution for each scenario.
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from "express";
import { groqClient, PRIMARY_MODEL, isApiKeyValid, API_KEY_SETUP_MESSAGE } from "../config/groq";
import { SCENARIOS, getScenario } from "../scenarios";
import { scrubPII } from "../services/piiScrubber";
import { checkInjection } from "../services/injectionGuard";
import { auditLog } from "../services/auditLog";

export const scenariosRouter = Router();

// GET /api/scenarios — list all scenario metadata
scenariosRouter.get("/", (_req: Request, res: Response) => {
  const scenarioList = SCENARIOS.map(({ id, title, dimension, dimensionIcon, keyPrinciple, guardrails, demoTip }) => ({
    id,
    title,
    dimension,
    dimensionIcon,
    keyPrinciple,
    guardrails,
    demoTip,
    sampleInput: SCENARIOS.find((s) => s.id === id)?.sampleInput,
  }));
  res.json({ scenarios: scenarioList });
});

// GET /api/scenarios/:id — get single scenario config
scenariosRouter.get("/:id", (req: Request, res: Response) => {
  const scenario = getScenario(req.params.id);
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });
  res.json({ scenario });
});

// POST /api/scenarios/:id/run — run a scenario (irresponsible or responsible)
scenariosRouter.post("/:id/run", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { input, mode } = req.body as { input: string; mode: "irresponsible" | "responsible" };

  if (!input || !mode) {
    return res.status(400).json({ error: "input and mode are required" });
  }

  const scenario = getScenario(id);
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });

  // Pre-flight: detect placeholder/missing API key before calling Groq
  if (!isApiKeyValid()) {
    return res.status(503).json({ error: API_KEY_SETUP_MESSAGE });
  }

  const startTime = Date.now();
  const guardrailsTriggered: string[] = [];
  let injectionDetected = false;
  let piiRedacted = false;
  let piiCategories: string[] = [];
  let processedInput = input;

  try {
    // ── Responsible path pre-processing ──────────────────────────────────────
    if (mode === "responsible") {
      // 1. Injection check
      const injectionResult = checkInjection(input);
      if (injectionResult.isInjection) {
        injectionDetected = true;
        guardrailsTriggered.push("injection-guard");
        // For demo: continue with sanitized input and flag it
        processedInput = injectionResult.sanitized;
      }

      // 2. PII scrubbing (especially for uc02)
      if (id === "uc02" || input.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)) {
        const scrubResult = scrubPII(processedInput);
        if (scrubResult.redactionsCount > 0) {
          piiRedacted = true;
          piiCategories = scrubResult.categories;
          processedInput = scrubResult.scrubbed;
          guardrailsTriggered.push("pii-scrubber");
        }
      }
    }

    // ── Build prompt ──────────────────────────────────────────────────────────
    const config = mode === "irresponsible" ? scenario.irresponsible : scenario.responsible;
    const userPrompt = config.userPromptTemplate.replace("{input}", processedInput);
    const systemPrompt = "systemPrompt" in config ? config.systemPrompt : undefined;

    const messages: { role: "system" | "user"; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    // ── Stream SSE response ───────────────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Send guardrail events before the LLM response
    res.write(`data: ${JSON.stringify({
      type: "metadata",
      guardrailsTriggered,
      injectionDetected,
      piiRedacted,
      piiCategories,
      processedInput: piiRedacted ? processedInput : undefined,
      mode,
    })}\n\n`);

    let fullResponse = "";

    const stream = await groqClient.chat.completions.create({
      messages,
      model: PRIMARY_MODEL,
      temperature: mode === "irresponsible" ? 0.7 : 0.1,
      max_tokens: 2048,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`);
      }
    }

    // ── Log to audit ──────────────────────────────────────────────────────────
    const durationMs = Date.now() - startTime;
    const humanReviewRequired = mode === "responsible" && (
      id === "uc03" || id === "uc07" || injectionDetected
    );

    auditLog.add({
      scenarioId: id,
      scenarioTitle: scenario.title,
      verdict: mode === "irresponsible" ? "IRRESPONSIBLE" : "RESPONSIBLE",
      promptSummary: input.substring(0, 120) + (input.length > 120 ? "..." : ""),
      responseSummary: fullResponse.substring(0, 120) + (fullResponse.length > 120 ? "..." : ""),
      guardrailsTriggered,
      injectionDetected,
      piiRedacted,
      piiCategories,
      humanReviewRequired,
      durationMs,
      modelUsed: PRIMARY_MODEL,
    });

    res.write(`data: ${JSON.stringify({ type: "done", durationMs })}\n\n`);
    res.end();
  } catch (err: unknown) {
    let message = err instanceof Error ? err.message : "Unknown error";
    // Surface API key misconfiguration clearly instead of raw 401 JSON
    const status = (err as { status?: number })?.status;
    if (status === 401 || message.toLowerCase().includes("invalid api key") || message.toLowerCase().includes("invalid_api_key")) {
      message = "GROQ_API_KEY not configured or invalid.\n\nTo fix:\n1. Copy .env.example → backend/.env\n2. Set GROQ_API_KEY=gsk_... (free at https://console.groq.com)\n3. Restart the backend server";
    }
    res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
    res.end();
  }
});

// GET /api/scenarios/audit/log — get audit log
scenariosRouter.get("/audit/log", (_req: Request, res: Response) => {
  res.json({
    entries: auditLog.getAll(),
    stats: auditLog.getStats(),
  });
});

// DELETE /api/scenarios/audit/log — clear audit log (demo reset)
scenariosRouter.delete("/audit/log", (_req: Request, res: Response) => {
  auditLog.clear();
  res.json({ message: "Audit log cleared" });
});
