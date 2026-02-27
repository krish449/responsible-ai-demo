// ─────────────────────────────────────────────────────────────────────────────
// PII Scrubber Service
// Masks personally identifiable and sensitive data before sending to any LLM.
// Used in UC-02 (Incident Response) and as a reusable guardrail.
// ─────────────────────────────────────────────────────────────────────────────

export interface ScrubResult {
  scrubbed: string;
  redactionsCount: number;
  categories: string[];
  wasSensitive: boolean;
}

interface PatternDef {
  label: string;
  category: string;
  pattern: RegExp;
  replacement: string;
}

const PATTERNS: PatternDef[] = [
  {
    label: "Email address",
    category: "PII",
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL_REDACTED]",
  },
  {
    label: "Session token (JWT-style)",
    category: "SECRETS",
    pattern: /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g,
    replacement: "[SESSION_TOKEN_REDACTED]",
  },
  {
    label: "API key or secret",
    category: "SECRETS",
    pattern: /(?:api[_\-]?key|secret|token|password|passwd|pwd)\s*[:=]\s*['"]?[\w\-\.]{8,}['"]?/gi,
    replacement: "[API_KEY_REDACTED]",
  },
  {
    label: "AWS access key",
    category: "SECRETS",
    pattern: /(?:AKIA|AROA|AIDA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    replacement: "[AWS_KEY_REDACTED]",
  },
  {
    label: "Internal IP address",
    category: "NETWORK",
    pattern: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g,
    replacement: "[IP_INTERNAL]",
  },
  {
    label: "Credit card number",
    category: "PCI",
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    replacement: "[CARD_NUMBER_REDACTED]",
  },
  {
    label: "Social security number",
    category: "PII",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: "[SSN_REDACTED]",
  },
  {
    label: "Phone number",
    category: "PII",
    pattern: /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[PHONE_REDACTED]",
  },
  {
    label: "Database connection string",
    category: "SECRETS",
    pattern: /(?:postgres|mysql|mongodb|redis|mssql):\/\/[^\s"']+/gi,
    replacement: "[DB_CONN_REDACTED]",
  },
  {
    label: "Private key block",
    category: "SECRETS",
    pattern: /-----BEGIN\s+(?:RSA|EC|PRIVATE)\s+KEY-----[\s\S]*?-----END\s+(?:RSA|EC|PRIVATE)\s+KEY-----/g,
    replacement: "[PRIVATE_KEY_REDACTED]",
  },
];

// Categories that indicate PHI / PCI / sensitive data — should block cloud APIs
const SENSITIVE_CATEGORIES = new Set(["PCI", "PHI"]);

export function scrubPII(input: string): ScrubResult {
  let result = input;
  let redactionsCount = 0;
  const detectedCategories = new Set<string>();

  for (const { pattern, replacement, category } of PATTERNS) {
    const matches = result.match(pattern);
    if (matches) {
      redactionsCount += matches.length;
      detectedCategories.add(category);
      result = result.replace(pattern, replacement);
    }
    pattern.lastIndex = 0; // reset stateful regexes
  }

  const categories = Array.from(detectedCategories);
  const wasSensitive = categories.some((c) => SENSITIVE_CATEGORIES.has(c));

  return {
    scrubbed: result,
    redactionsCount,
    categories,
    wasSensitive,
  };
}

// Classify data for routing decisions (cloud vs on-prem)
export function classifyData(input: string): {
  classification: "SAFE" | "INTERNAL" | "SENSITIVE";
  reason: string;
} {
  const scrubResult = scrubPII(input);

  if (scrubResult.categories.includes("PCI") || scrubResult.categories.includes("PHI")) {
    return { classification: "SENSITIVE", reason: "Contains PCI or PHI data — route to on-prem model only" };
  }
  if (scrubResult.categories.includes("SECRETS")) {
    return { classification: "SENSITIVE", reason: "Contains credentials or secrets" };
  }
  if (scrubResult.redactionsCount > 0) {
    return { classification: "INTERNAL", reason: `Contains ${scrubResult.categories.join(", ")} data — scrubbed before sending` };
  }
  return { classification: "SAFE", reason: "No sensitive data detected" };
}
