export type Dimension =
  | "Transparency"
  | "Privacy & Data Safety"
  | "Human Oversight"
  | "Fairness & Bias"
  | "Security"
  | "Accuracy & Hallucination";

export interface GuardrailConfig {
  id: string;
  label: string;
  description: string;
  active: boolean;
}

export interface ScenarioSummary {
  id: string;
  title: string;
  dimension: Dimension;
  dimensionIcon: string;
  keyPrinciple: string;
  guardrails: GuardrailConfig[];
  demoTip: string;
  sampleInput: string;
}

export interface RunMetadata {
  guardrailsTriggered: string[];
  injectionDetected: boolean;
  piiRedacted: boolean;
  piiCategories: string[];
  processedInput?: string;
  mode: "irresponsible" | "responsible";
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  scenarioId: string;
  scenarioTitle: string;
  verdict: "IRRESPONSIBLE" | "RESPONSIBLE";
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

export interface AuditStats {
  total: number;
  irresponsible: number;
  responsible: number;
  injectionAttempts: number;
  piiRedactions: number;
  humanReviewRequired: number;
  avgDurationMs: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  metadata?: {
    injectionDetected?: boolean;
    destructiveWarning?: boolean;
    guardrailsTriggered?: string[];
    deflected?: boolean;
  };
}
