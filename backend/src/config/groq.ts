import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

// Common placeholder/unconfigured key patterns
const PLACEHOLDER_PATTERNS = ["your_key", "gsk_your", "placeholder", "xxx", "test_key", "add_your"];

/**
 * Returns true only if the GROQ_API_KEY is set AND is not a placeholder value.
 * Use this check BEFORE making any Groq API calls to surface clear setup errors.
 */
export function isApiKeyValid(): boolean {
  const key = process.env.GROQ_API_KEY ?? "";
  if (!key) return false;
  return !PLACEHOLDER_PATTERNS.some((p) => key.toLowerCase().includes(p));
}

export const API_KEY_SETUP_MESSAGE =
  "GROQ_API_KEY not configured.\n\nSetup steps:\n1. Copy .env.example → backend/.env\n2. Set GROQ_API_KEY=gsk_... (free key at https://console.groq.com)\n3. Restart the backend server";

// Allow the server to start even with a placeholder key — we'll detect it at call time
const rawKey = process.env.GROQ_API_KEY || "placeholder_key_not_configured";

export const groqClient = new Groq({
  apiKey: rawKey,
});

// Primary model for complex reasoning tasks
export const PRIMARY_MODEL = "llama-3.3-70b-versatile";

// Fast model for quick classifications / guardrail checks
export const FAST_MODEL = "llama-3.1-8b-instant";
