// ─────────────────────────────────────────────────────────────────────────────
// API Service — All backend communication
// Handles both regular fetch and SSE streaming requests.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = "/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("rai_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type StreamCallback = (event: StreamEvent) => void;

export interface StreamEvent {
  type: "metadata" | "delta" | "done" | "error";
  content?: string;
  durationMs?: number;
  turnCount?: number;
  message?: string;
  guardrailsTriggered?: string[];
  injectionDetected?: boolean;
  piiRedacted?: boolean;
  piiCategories?: string[];
  processedInput?: string;
  destructiveWarning?: boolean;
  deflected?: boolean;
  mode?: string;
}

// ── Scenarios API ─────────────────────────────────────────────────────────────

export async function fetchScenarios() {
  const res = await fetch(`${BASE_URL}/scenarios`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch scenarios");
  return res.json();
}

export async function fetchScenario(id: string) {
  const res = await fetch(`${BASE_URL}/scenarios/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch scenario");
  return res.json();
}

export async function runScenarioStream(
  scenarioId: string,
  input: string,
  mode: "irresponsible" | "responsible",
  onEvent: StreamCallback,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${BASE_URL}/scenarios/${scenarioId}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ input, mode }),
    signal,
  });

  if (!res.ok) {
    // Non-SSE error response (e.g., 503 API key not configured) — surface as error event
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    onEvent({ type: "error", message: body.error ?? `HTTP ${res.status}` });
    return;
  }
  await consumeSSE(res, onEvent);
}

// ── Chat API (UC-08) ──────────────────────────────────────────────────────────

export async function createChatSession(mode: "irresponsible" | "responsible") {
  const res = await fetch(`${BASE_URL}/chat/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error("Failed to create chat session");
  return res.json() as Promise<{ sessionId: string; mode: string }>;
}

export async function sendChatMessage(
  sessionId: string,
  message: string,
  onEvent: StreamCallback,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${BASE_URL}/chat/sessions/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    onEvent({ type: "error", message: body.error ?? `HTTP ${res.status}` });
    return;
  }
  await consumeSSE(res, onEvent);
}

export async function clearChatSession(sessionId: string) {
  await fetch(`${BASE_URL}/chat/sessions/${sessionId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

// ── Audit Log API ─────────────────────────────────────────────────────────────

export async function fetchAuditLog() {
  const res = await fetch(`${BASE_URL}/scenarios/audit/log`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch audit log");
  return res.json();
}

export async function clearAuditLog() {
  await fetch(`${BASE_URL}/scenarios/audit/log`, { method: "DELETE", headers: authHeaders() });
}

// ── SSE Consumer ──────────────────────────────────────────────────────────────

async function consumeSSE(res: Response, onEvent: StreamCallback): Promise<void> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event = JSON.parse(line.slice(6)) as StreamEvent;
          onEvent(event);
        } catch {
          // ignore malformed SSE lines
        }
      }
    }
  }
}
