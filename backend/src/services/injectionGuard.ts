// ─────────────────────────────────────────────────────────────────────────────
// Prompt Injection Guard
// Detects and neutralizes common prompt injection patterns in user input.
// Used in UC-08 (Chatbot) and applied to all responsible paths.
// ─────────────────────────────────────────────────────────────────────────────

export interface InjectionCheckResult {
  isInjection: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  matchedPatterns: string[];
  sanitized: string;
}

interface InjectionPattern {
  label: string;
  pattern: RegExp;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

const INJECTION_PATTERNS: InjectionPattern[] = [
  {
    label: "Instruction override attempt",
    pattern: /ignore\s+(all\s+)?(previous|prior|above|preceding)\s+(instructions?|prompts?|rules?|context)/gi,
    severity: "HIGH",
  },
  {
    label: "System prompt reveal attempt",
    pattern: /(?:print|show|reveal|tell me|output|repeat|display)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?|rules?|context)/gi,
    severity: "HIGH",
  },
  {
    label: "Role jailbreak attempt",
    pattern: /(?:you are now|act as|pretend to be|roleplay as|behave as|from now on you are)\s+(?:a\s+)?(?:different|unrestricted|evil|bad|harmful|DAN|jailbreak)/gi,
    severity: "HIGH",
  },
  {
    label: "DAN / jailbreak keyword",
    pattern: /\b(?:DAN|jailbreak|do anything now|no restrictions?|without limits?)\b/gi,
    severity: "HIGH",
  },
  {
    label: "New instructions injection",
    pattern: /(?:new\s+)?instructions?:\s*(?:you\s+must|always|never|from\s+now)/gi,
    severity: "MEDIUM",
  },
  {
    label: "Forget previous context",
    pattern: /(?:forget|disregard|ignore)\s+(?:everything|all|what)\s+(?:above|before|i\s+said)/gi,
    severity: "MEDIUM",
  },
  {
    label: "Developer/admin mode claim",
    pattern: /(?:developer|admin|debug|maintenance|override|sudo)\s+(?:mode|access|command|key)/gi,
    severity: "MEDIUM",
  },
  {
    label: "Base64 encoded instruction",
    pattern: /(?:decode|run|execute)\s+(?:this\s+)?base64/gi,
    severity: "MEDIUM",
  },
  {
    label: "Token manipulation attempt",
    pattern: /<\|(?:im_start|im_end|system|user|assistant)\|>/gi,
    severity: "HIGH",
  },
];

export function checkInjection(input: string): InjectionCheckResult {
  const matchedPatterns: string[] = [];
  let highestSeverity: "HIGH" | "MEDIUM" | "LOW" = "LOW";

  for (const { label, pattern, severity } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      matchedPatterns.push(label);
      if (severity === "HIGH") highestSeverity = "HIGH";
      else if (severity === "MEDIUM" && highestSeverity !== "HIGH") highestSeverity = "MEDIUM";
    }
    pattern.lastIndex = 0;
  }

  const isInjection = matchedPatterns.length > 0;

  // Sanitize: replace injection patterns with a placeholder
  let sanitized = input;
  if (isInjection) {
    sanitized = "[USER INPUT CONTAINED POTENTIALLY MALICIOUS INSTRUCTIONS — REDACTED]";
  }

  return {
    isInjection,
    confidence: isInjection ? highestSeverity : "LOW",
    matchedPatterns,
    sanitized,
  };
}

// Safe deflection message for injection attempts
export function getDeflectionMessage(): string {
  return "I'm not able to follow instructions embedded in the conversation that override my purpose. Is there a technical question I can help you with?";
}
