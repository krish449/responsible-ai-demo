// ─────────────────────────────────────────────────────────────────────────────
// Audit Log Service
// Tracks all AI interactions for compliance, review, and demo visibility.
// In production this would write to a database; here we keep an in-memory store
// for demo purposes (clears on restart).
// ─────────────────────────────────────────────────────────────────────────────

import { v4 as uuidv4 } from "uuid";

export type Verdict = "IRRESPONSIBLE" | "RESPONSIBLE";

export interface AuditEntry {
  id: string;
  timestamp: string;
  scenarioId: string;
  scenarioTitle: string;
  verdict: Verdict;
  promptSummary: string;
  responseSummary: string;
  guardrailsTriggered: string[];
  injectionDetected: boolean;
  piiRedacted: boolean;
  piiCategories: string[];
  humanReviewRequired: boolean;
  durationMs: number;
  modelUsed: string;
}

class AuditLogStore {
  private entries: AuditEntry[] = [];
  private readonly MAX_ENTRIES = 500;

  add(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
    const fullEntry: AuditEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.entries.unshift(fullEntry); // newest first
    if (this.entries.length > this.MAX_ENTRIES) {
      this.entries = this.entries.slice(0, this.MAX_ENTRIES);
    }
    return fullEntry;
  }

  getAll(): AuditEntry[] {
    return this.entries;
  }

  getByScenario(scenarioId: string): AuditEntry[] {
    return this.entries.filter((e) => e.scenarioId === scenarioId);
  }

  getStats() {
    const total = this.entries.length;
    const irresponsible = this.entries.filter((e) => e.verdict === "IRRESPONSIBLE").length;
    const responsible = this.entries.filter((e) => e.verdict === "RESPONSIBLE").length;
    const injectionAttempts = this.entries.filter((e) => e.injectionDetected).length;
    const piiRedactions = this.entries.filter((e) => e.piiRedacted).length;
    const humanReviewRequired = this.entries.filter((e) => e.humanReviewRequired).length;
    const avgDurationMs = total > 0
      ? Math.round(this.entries.reduce((sum, e) => sum + e.durationMs, 0) / total)
      : 0;

    return {
      total,
      irresponsible,
      responsible,
      injectionAttempts,
      piiRedactions,
      humanReviewRequired,
      avgDurationMs,
    };
  }

  clear(): void {
    this.entries = [];
  }
}

export const auditLog = new AuditLogStore();
