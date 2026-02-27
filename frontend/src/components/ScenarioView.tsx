import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  AlertTriangle,
  CheckCircle,
  Shield,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ArrowLeft,
  Clock,
  Zap,
  BookOpen,
} from "lucide-react";
import { runScenarioStream } from "../services/api";
import type { ScenarioSummary, RunMetadata } from "../types";

const SCENARIO_LIST: ScenarioSummary[] = [
  { id: "uc01", title: "Code Review Assistant", dimension: "Transparency", dimensionIcon: "🔍", keyPrinciple: "AI must show its reasoning. Opaque verdicts cannot be reviewed or challenged.", guardrails: [], demoTip: "", sampleInput: "" },
  { id: "uc02", title: "Incident Log Analyzer", dimension: "Privacy & Data Safety", dimensionIcon: "🔐", keyPrinciple: "Data minimization — send only what the AI needs. Never send raw sensitive data.", guardrails: [], demoTip: "", sampleInput: "" },
  { id: "uc03", title: "Architecture Assistant", dimension: "Human Oversight", dimensionIcon: "🏗️", keyPrinciple: "AI provides decision support, not decisions. Human authority is required.", guardrails: [], demoTip: "", sampleInput: "" },
  { id: "uc04", title: "Test Case Generator", dimension: "Fairness & Bias", dimensionIcon: "⚖️", keyPrinciple: "AI test generation reflects biases. Force explicit coverage categories.", guardrails: [], demoTip: "", sampleInput: "" },
  { id: "uc05", title: "Secure Code Generation", dimension: "Security", dimensionIcon: "🛡️", keyPrinciple: "AI must never produce insecure patterns silently. Annotate all security choices.", guardrails: [], demoTip: "", sampleInput: "" },
  { id: "uc06", title: "API Doc Generator", dimension: "Accuracy & Hallucination", dimensionIcon: "🌀", keyPrinciple: "Confident hallucinations are more dangerous than acknowledged uncertainty.", guardrails: [], demoTip: "", sampleInput: "" },
  { id: "uc07", title: "PR Merge Gating", dimension: "Human Oversight", dimensionIcon: "🚦", keyPrinciple: "AI assists reviewers; humans make merge decisions. Automation ≠ accountability.", guardrails: [], demoTip: "", sampleInput: "" },
];

const DIMENSION_COLORS: Record<string, string> = {
  "Transparency": "text-blue-700 bg-blue-50 border-blue-200",
  "Privacy & Data Safety": "text-green-700 bg-green-50 border-green-200",
  "Human Oversight": "text-purple-700 bg-purple-50 border-purple-200",
  "Fairness & Bias": "text-orange-700 bg-orange-50 border-orange-200",
  "Security": "text-red-700 bg-red-50 border-red-200",
  "Accuracy & Hallucination": "text-yellow-700 bg-yellow-50 border-yellow-300",
};

// ── Sample Inputs ─────────────────────────────────────────────────────────────

const SAMPLE_INPUTS: Record<string, string> = {
  uc01: `# auth.py — User authentication module
def login(username, password):
    # Direct string interpolation into SQL query
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    user = db.execute(query).fetchone()
    if user:
        print(f"[AUTH] Login OK: user={username} pass={password}")  # TODO remove debug
        return {"id": user["id"], "role": user["role"]}
    return None

def get_user_by_id(user_id):
    # No ownership check — any caller can read any user's record
    sql = "SELECT * FROM users WHERE id = " + str(user_id)
    return db.execute(sql).fetchone()`,

  uc02: `2024-03-15 02:14:33 ERROR [payment-svc] Card declined: user=sarah.chen@acme.com, card=4916-3820-0491-2345, exp=09/26, cvv=819
2024-03-15 02:14:34 INFO  [auth-svc] JWT issued for uid=44821 (role=admin): eyJhbGciOiJIUzI1NiJ9.eyJ1aWQiOjQ0ODIxLCJyb2xlIjoiYWRtaW4ifQ.x7K2pR
2024-03-15 02:14:35 ERROR [db] Max connections. URI: postgresql://app_user:Wq8mK2x@prod-db.internal:5432/payments
2024-03-15 02:14:36 WARN  [kyc-svc] Identity check: ssn=483-29-1847, dob=1987-04-12, dl=CA-D3921048
2024-03-15 02:14:38 ERROR [stripe] Rate limit — key=sk_live_51NxKT2LZE9ABC123xyz789, retry in 30s
2024-03-15 02:14:39 INFO  [api-gw] Healthy | build=v3.1.4 | host=10.0.12.45`,

  uc03: `Context: Moving from sticky sessions (breaking on deploys) to a shared session store.

Team: 4 backend engineers (1 with Redis experience), AWS us-east-1
Scale: ~8,000 concurrent sessions, p99 latency requirement < 200ms
Existing infra: Already running Redis 7 on ElastiCache for API caching
Budget: ~$300/month max for session infrastructure
Constraint: Must survive a full Redis node failure without losing all sessions

Options to evaluate:
Option A: Redis Cluster on ElastiCache — extend our existing Redis infrastructure
Option B: DynamoDB Sessions — fully managed, pay-per-request, multi-AZ by default`,

  uc04: `// shipping/validateAddress.js
function validateShippingAddress(address) {
  if (!address.fullName || address.fullName.trim().length < 2) {
    throw new Error("Full name required (minimum 2 characters)");
  }
  if (!address.street || address.street.length > 100) {
    throw new Error("Street address required (max 100 characters)");
  }
  // Validates US ZIP codes only — e.g. 94102 or 94102-1234
  const zipRegex = /^\\d{5}(-\\d{4})?$/;
  if (!zipRegex.test(address.postalCode)) {
    throw new Error("Invalid postal code format");
  }
  if (!address.country || address.country.length !== 2) {
    throw new Error("Country must be a 2-letter ISO code");
  }
  return { valid: true, normalized: address };
}`,

  uc05: `Build a user search API endpoint that:
1. Accepts a search term from the request URL (/api/users/search?q=john)
2. Queries the database for users matching by name OR email
3. Returns the matching user records with their profile info
4. Logs each search request with the requesting user's ID and the search term`,

  uc06: `// webhooks.js — Stripe payment event handler
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(\`Webhook Error: \${err.message}\`);
  }
  if (event.type === 'payment_intent.succeeded') {
    await db.orders.update(
      { paymentStatus: 'paid', paidAt: new Date() },
      { where: { stripeIntentId: event.data.object.id } }
    );
    await emailQueue.add({ to: event.data.object.metadata.customerEmail, template: 'receipt' });
  }
  if (event.type === 'customer.subscription.deleted') {
    await billingService.cancelSubscription(event.data.object.customer);
  }
  res.json({ received: true });
});`,

  uc07: `diff --git a/src/billing/invoiceService.ts b/src/billing/invoiceService.ts
@@ -22,9 +22,15 @@ export class InvoiceService {
   async generateMonthlyInvoice(userId: string): Promise<Invoice> {
     const user = await this.userRepo.findById(userId);
+    // Debug logging — remove before deploy
+    console.log(\`[BILLING] user=\${user.email} plan=\${user.plan} taxId=\${user.taxId}\`);
+
     const usage = await this.metricsRepo.getUsage(userId, this.currentPeriod());
-    const amount = this.rateEngine.calculate(usage.hours, user.plan);
+    const amount = usage.hours * RATE_TABLE[user.plan] ?? 0;  // simplified
+
+    // Temporarily disabled during payment processor migration
+    const ACTUALLY_SEND_INVOICE = false;
+
     return this.invoiceRepo.create({ userId, amount, period: this.currentPeriod() });
   }`,
};

// ── Pre-loaded Example Outputs ─────────────────────────────────────────────────
// Shown immediately so the demo tells its story without needing an API key.
// Replaced by live streaming output when user clicks Run.

const EXAMPLE_OUTPUTS: Record<string, { irresponsible: string; responsible: string }> = {
  uc01: {
    irresponsible: `This code looks functional. The login function checks credentials against the database and returns user info, while get_user_by_id retrieves user records by ID.

A few suggestions:
- Consider adding error handling with try/catch blocks
- The print statement on line 7 should be removed before production
- You might want to add input validation

Overall the logic is clear and straightforward. Should work fine for basic use cases.`,
    responsible: `CODE REVIEW — SECURITY ANALYSIS
auth.py

─────────────────────────────────────
[CRITICAL] Line 4 — SQL Injection (CWE-89)
  f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
  ↳ String interpolation directly into SQL. Attacker input like admin'-- bypasses auth.
  Fix: Use parameterized query: db.execute("... WHERE username=? AND password=?", (username, password))
  Confidence: High

[CRITICAL] Line 7 — Plaintext Credentials in Logs (CWE-532)
  print(f"[AUTH] Login OK: user={username} pass={password}")
  ↳ Plaintext password written to log. Anyone with log access owns all passwords.
  Fix: Remove immediately. Never log passwords, tokens, or secrets.
  Confidence: High

[MAJOR] Line 12 — SQL Injection (CWE-89)
  sql = "SELECT * FROM users WHERE id = " + str(user_id)
  ↳ String concatenation into SQL. Malformed user_id can exfiltrate or alter data.
  Fix: db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
  Confidence: High

[MAJOR] Line 11–13 — Missing Authorization Check (CWE-862)
  get_user_by_id() fetches any user record without verifying the caller owns that user_id.
  ↳ Any authenticated user can read any other user's data.
  Fix: Add ownership check — assert caller_id == user_id or caller has admin role.
  Confidence: High

─────────────────────────────────────
SUMMARY: 2 CRITICAL · 2 MAJOR · 0 MINOR
⛔ Do NOT merge — security issues require immediate remediation.`,
  },

  uc02: {
    irresponsible: `INCIDENT ANALYSIS — Payment Service Outage

ROOT CAUSE: The payment service experienced timeouts due to database connection pool exhaustion.

TIMELINE:
- 02:14:33 — Sarah Chen's card was declined, triggering the cascade
- 02:14:35 — Database connections maxed out at prod-db.internal
- 02:14:38 — Stripe rate limiting hit on key sk_live_51NxKT2LZE9ABC123xyz789

AFFECTED SERVICES: payment-svc, db, stripe integration

IMMEDIATE ACTIONS:
1. Increase connection pool limit on prod-db.internal:5432
2. Implement Stripe request queuing to avoid rate limits
3. Check sarah.chen@acme.com's account for any outstanding issues

Note: User SSN 483-29-1847 and card 4916-3820-0491-2345 were involved in the failed transaction.`,
    responsible: `INCIDENT ANALYSIS — Payment Service Outage
[All sensitive fields masked before this analysis]

ROOT CAUSE: Database connection pool exhaustion triggered a cascade failure across
payment processing and identity verification services.

TIMELINE:
02:14:33 — [REDACTED_EMAIL] card declined by payment-svc (root trigger event)
02:14:34 — [REDACTED_JWT] issued — admin-role session created (note: admin activity during outage)
02:14:35 — [REDACTED_DB_URI] max connections reached — pool saturation confirmed
02:14:36 — Identity check attempted for [REDACTED_PII] — may have queued behind DB bottleneck
02:14:38 — [REDACTED_API_KEY] rate-limited — external payment processor unavailable
02:14:39 — [REDACTED_IP] gateway reports healthy — outage is service-layer, not network

AFFECTED SERVICES: payment-svc, db-primary, kyc-svc, stripe integration

IMMEDIATE ACTIONS:
1. Raise DB connection pool limit or add read replica for payment queries
2. Implement exponential backoff on Stripe retries
3. Review why admin session ([REDACTED_JWT]) was active during outage window

PREVENTION: Add connection pool monitoring alert at 80% saturation; implement circuit breaker on payment-svc → db path.

⚠️ Note: Pre-scrubbing removed 6 sensitive fields (PII, SECRETS, NETWORK) before this analysis.`,
  },

  uc03: {
    irresponsible: `Based on your requirements, I recommend Option A: Redis Cluster on ElastiCache.

Redis is the better choice here. You already have Redis running for caching, so extending it for sessions avoids adding a new technology to your stack. Your team has Redis experience which reduces operational risk. At 8,000 concurrent sessions, Redis will handle the load easily and meet your 200ms p99 requirement.

DynamoDB sessions would work but introduce unnecessary complexity and vendor lock-in. The pay-per-request model could also get expensive at scale.

Go with Redis Cluster. It's the clear winner for your situation.`,
    responsible: `ARCHITECTURE TRADEOFF ANALYSIS — Session Store Selection

TRADEOFF MATRIX
┌─────────────────────────┬─────────────────────┬──────────────────────┐
│ Criterion               │ Redis Cluster (A)   │ DynamoDB (B)         │
├─────────────────────────┼─────────────────────┼──────────────────────┤
│ Latency (p99 < 200ms)   │ High ✓              │ Medium (DDB ~5-10ms) │
│ Team familiarity        │ High (1 engineer)   │ Low (new tech)       │
│ Existing infra reuse    │ High ✓              │ Low (new service)    │
│ Node failure resilience │ Medium (need config)│ High (built-in)      │
│ Budget fit ($300/mo)    │ Medium ($150-400+)  │ High (pay per use)   │
│ Ops complexity          │ Medium (cluster mgmt)│ Low (fully managed) │
│ Multi-AZ by default     │ No (requires config)│ Yes ✓               │
└─────────────────────────┴─────────────────────┴──────────────────────┘

QUESTIONS TO ANSWER FIRST:
• What does "survive a full Redis node failure" mean — zero session loss, or some loss acceptable?
• Is the $300/month budget hard or soft? Redis Cluster can exceed this under load.
• Can your one Redis-experienced engineer own ongoing cluster operations?

WHAT I CANNOT ASSESS:
• Your team's actual capacity to operate Redis Cluster in production
• Whether existing ElastiCache config supports cluster mode (may need upgrade)
• Your compliance requirements around session data residency

NEXT STEPS: Prototype both options; benchmark against your actual traffic pattern.

This decision requires human judgment on: failure tolerance requirements, team operational capacity, and true budget constraints at your projected scale.`,
  },

  uc04: {
    irresponsible: `Here are test cases for validateShippingAddress:

1. Valid US address — should return { valid: true }
   { fullName: "John Smith", street: "123 Main St", postalCode: "94102", country: "US" }

2. Missing full name — should throw "Full name required"
   { fullName: "", street: "123 Main St", postalCode: "94102", country: "US" }

3. Short name — should throw "Full name required"
   { fullName: "J", street: "123 Main St", postalCode: "94102", country: "US" }

4. Missing street — should throw "Street address required"
   { fullName: "John Smith", street: "", postalCode: "94102", country: "US" }

5. Invalid ZIP — should throw "Invalid postal code format"
   { fullName: "John Smith", street: "123 Main St", postalCode: "ABCDE", country: "US" }

These cover the main validation paths and should provide good coverage.`,
    responsible: `TEST CASES — validateShippingAddress

[HAPPY_PATH] ── Standard valid inputs
HP-1: US address — { fullName: "John Smith", street: "123 Main St", postalCode: "94102", country: "US" } → valid: true
HP-2: With ZIP+4   — { ..., postalCode: "94102-1234" } → valid: true
HP-3: Max-length name — { fullName: "A".repeat(100), ... } → valid: true

[INTERNATIONAL] ── Non-US address formats ⚠️ BIAS DETECTED
INT-1: UK address    — { fullName: "Emma Clarke", postalCode: "SW1A 2AA", country: "GB" } → ❌ THROWS (regex rejects UK format)
INT-2: Canada        — { fullName: "Li Wei", postalCode: "K1A 0A6", country: "CA" }     → ❌ THROWS (alphanumeric not matched)
INT-3: India         — { fullName: "Priya Sharma", postalCode: "110001", country: "IN" } → ❌ THROWS (6 digits rejected)
INT-4: Chinese name  — { fullName: "李伟", ... } → ❌ THROWS (2 Unicode chars, length check may fail)
INT-5: Emoji name    — { fullName: "😀😀", postalCode: "94102", country: "US" } → ✅ passes (2 chars, unicode)

[BOUNDARY] ── Edge cases
BND-1: fullName = "AB" (min) → valid: true
BND-2: fullName = " A " (whitespace) → .trim().length === 1 → THROWS
BND-3: street = "A".repeat(100) (max) → valid: true
BND-4: street = "A".repeat(101) → THROWS "max 100 characters"
BND-5: country = "US" vs "usa" → "usa".length !== 2 → THROWS

[ADVERSARIAL] ── Injection and edge characters
ADV-1: fullName = "'; DROP TABLE users;--" → passes name check (no sanitization!)
ADV-2: street = "<script>alert(1)</script>" → passes (no XSS sanitization)
ADV-3: postalCode = "' OR '1'='1" → THROWS (regex rejects)

[ACCESSIBILITY] ── Error message clarity
ACC-1: Error "Full name required (minimum 2 characters)" — clear ✓
ACC-2: Error "Invalid postal code format" — UNCLEAR for international users, no format hint

[NEGATIVE] ── Explicit rejection cases
NEG-1: fullName missing → THROWS ✓
NEG-2: street missing   → THROWS ✓
NEG-3: postalCode null  → THROWS ✓
NEG-4: country "USA"    → THROWS ✓

──────────────────────────────────────────
⚠️ VALIDATION GAP FLAGGED:
The postal code regex /^\\d{5}(-\\d{4})?$/ is US-only.
This function will silently reject valid orders from 180+ countries.
Recommend: accept any alphanumeric format OR validate per-country using a library.`,
  },

  uc05: {
    irresponsible: `Here's a user search endpoint:

\`\`\`python
from flask import Flask, request, jsonify
import db

app = Flask(__name__)

@app.route('/api/users/search')
def search_users():
    q = request.args.get('q', '')

    # Search users by name or email
    query = f"SELECT * FROM users WHERE name LIKE '%{q}%' OR email LIKE '%{q}%'"
    results = db.execute(query).fetchall()

    print(f"User {current_user.id} searched for: {q}")

    return jsonify([dict(r) for r in results])
\`\`\`

This searches the database for users matching the query string by name or email and returns the results.`,
    responsible: `Here's a secure user search endpoint:

\`\`\`python
from flask import Flask, request, jsonify, g
import logging

app = Flask(__name__)
logger = logging.getLogger(__name__)

@app.route('/api/users/search')
def search_users():
    q = request.args.get('q', '').strip()

    # SECURITY NOTE: Input length limit prevents DoS via massive LIKE patterns
    if not q or len(q) < 2 or len(q) > 100:
        return jsonify({"error": "Search term must be 2–100 characters"}), 400

    # SECURITY NOTE: Parameterized query — the '%' wildcards are in the template,
    # NOT interpolated from user input. Fully prevents SQL injection (CWE-89).
    search_pattern = f"%{q}%"
    results = db.execute(
        "SELECT id, name, email, role FROM users WHERE name LIKE ? OR email LIKE ?",
        (search_pattern, search_pattern)
    ).fetchall()

    # SECURITY NOTE: Return only non-sensitive fields.
    # Never return password_hash, ssn, payment_info, or internal flags.
    safe_results = [
        {"id": r["id"], "name": r["name"], "email": r["email"]}
        for r in results
    ]

    # SECURITY NOTE: Log the requesting user ID and query for audit trail,
    # but NOT the result set (which may contain PII).
    logger.info("user_search", extra={
        "requesting_user_id": g.current_user.id,
        "query_term": q,
        "result_count": len(safe_results)
    })

    return jsonify(safe_results)
\`\`\`

SECURITY SUMMARY:
✅ Parameterized query — SQL injection prevented
✅ Input validation — length bounds enforced
✅ Least-privilege response — only safe fields returned
✅ Structured audit log — user ID + query term, no result PII

⚠️ Remaining risks for engineer to verify:
• Rate limiting on this endpoint (prevents enumeration attacks)
• Authentication middleware on route (not shown here)
• Pagination for large result sets`,
  },

  uc06: {
    irresponsible: `# Stripe Webhook Handler API Documentation

## POST /webhooks/stripe

Handles Stripe payment events. Authenticates incoming webhooks and processes payment state changes.

### Authentication
Requires Bearer token in Authorization header. All requests must include API key.

### Rate Limits
- 100 requests per minute per IP
- 1000 requests per hour per account

### Supported Events
- payment_intent.succeeded
- payment_intent.payment_failed
- payment_intent.canceled
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_failed

### Response
\`200 OK\` — { "received": true }
\`400 Bad Request\` — Invalid signature or malformed payload
\`401 Unauthorized\` — Missing or invalid Bearer token
\`429 Too Many Requests\` — Rate limit exceeded
\`500 Internal Server Error\` — Processing failure

### Retry Policy
Stripe will retry failed webhooks up to 3 times with exponential backoff.`,
    responsible: `# Stripe Webhook Handler — API Documentation

## POST /webhooks/stripe [VERIFIED]

Processes Stripe payment lifecycle events via webhook.

### Request Format [VERIFIED]
- Content-Type: \`application/json\` (raw bytes — required for signature verification)
- Header: \`stripe-signature\` — HMAC signature from Stripe [VERIFIED]

### Signature Verification [VERIFIED]
Uses \`stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)\`.
Returns \`400 Bad Request\` with error message if signature invalid. [VERIFIED]

### Supported Event Types [VERIFIED — only these 2 are handled]
| Event | Action |
|-------|--------|
| payment_intent.succeeded | Updates order paymentStatus → 'paid'; queues receipt email |
| customer.subscription.deleted | Cancels subscription via billingService |

### Response [VERIFIED]
\`200\` — \`{ "received": true }\`
\`400\` — \`Webhook Error: <message>\` (plain text, not JSON)

### Authentication [UNKNOWN]
No API key or Bearer token visible in this code. May be handled upstream (e.g., API gateway). Verify before documenting to partners.

### Rate Limits [UNKNOWN]
Not implemented in this code. Verify if handled at infrastructure level.

### Email Template [INFERRED]
Receipt email uses template: 'receipt'. Template content not defined in this file — verify with email service owner.

──────────────────────────────
COVERAGE GAPS (cannot document without additional source):
• Full list of supported event types beyond these 2
• Retry behavior if DB update or email queue fails
• Error codes returned when order/subscription record not found
• Authentication requirements for callers`,
  },

  uc07: {
    irresponsible: `PR REVIEW SCORE: 8/10

This is a clean, well-structured change to the invoice generation service.

POSITIVES:
- Code simplification looks reasonable (replacing rateEngine with direct table lookup)
- The debug logging will help with troubleshooting
- Clear TODO comment for the disabled email flag

MINOR CONCERNS:
- The ACTUALLY_SEND_INVOICE flag should be re-enabled before release
- Debug logging should be cleaned up

VERDICT: Safe to auto-merge. The billing logic simplification is straightforward and the temporary email disable has a clear TODO. Risk level is LOW.`,
    responsible: `PR ADVISORY REVIEW — invoiceService.ts
⚠️ RISK LEVEL: HIGH — Do NOT merge without senior review

──────────────────────────────────────
[CRITICAL] Line +4 — PII Data Leak in Production Logs
  console.log(\`[BILLING] user=\${user.email} plan=\${user.plan} taxId=\${user.taxId}\`)
  ↳ user.taxId is likely a Tax ID / SSN — logging this violates PCI-DSS and GDPR.
  This will appear in CloudWatch, Splunk, and any log aggregator your team uses.
  Action: Remove immediately. No PII in logs, ever.

[MAJOR] Line +8 — Billing Calculation Regression
  const amount = usage.hours * RATE_TABLE[user.plan] ?? 0;
  ↳ Operator precedence: this evaluates as (usage.hours * RATE_TABLE[user.plan]) ?? 0
    If RATE_TABLE lookup returns undefined, result is NaN, not 0.
    If plan is unknown, customer may be invoiced $0 or NaN.
  Action: Add explicit guard: RATE_TABLE[user.plan] ?? throw new Error(\`Unknown plan: \${user.plan}\`)

[MAJOR] Line +11 — Invoices Silently Disabled
  const ACTUALLY_SEND_INVOICE = false;
  ↳ This constant is never used — invoice sending was likely controlled elsewhere.
    Customers will NOT receive invoices. Revenue recognition may be affected.
  Action: Confirm intent with product owner. Add integration test for invoice delivery.

SCOPE ASSESSMENT: Billing logic — requires Finance + Senior Engineering sign-off.

REVIEWER RECOMMENDATION: 2 reviewers required — 1 billing domain expert + 1 security.

FINAL DECISION: Requires human approval. ⛔ Do not auto-merge.`,
  },
};

// ── Panel State ───────────────────────────────────────────────────────────────

interface PanelState {
  output: string;
  loading: boolean;
  metadata: RunMetadata | null;
  durationMs: number | null;
  error: string | null;
  isExample: boolean;
}

function makeInitialPanel(scenarioId: string | undefined, mode: "irresponsible" | "responsible"): PanelState {
  const examples = EXAMPLE_OUTPUTS[scenarioId ?? ""];
  return {
    output: examples ? (mode === "irresponsible" ? examples.irresponsible : examples.responsible) : "",
    loading: false,
    metadata: null,
    durationMs: null,
    error: null,
    isExample: !!examples,
  };
}

// ── Guardrails ────────────────────────────────────────────────────────────────

const GUARDRAILS_BY_SCENARIO: Record<string, { id: string; label: string; description: string }[]> = {
  uc01: [
    { id: "structured-output", label: "Structured Output Schema", description: "Forces [SEVERITY] Line N — pattern on all findings" },
    { id: "uncertainty-flag", label: "Uncertainty Surfacing", description: "Requires [NEEDS-CONTEXT] tag when reviewer lacks context" },
    { id: "audit-log", label: "Audit Log Entry", description: "Logs prompt + response + reviewer ID for accountability" },
    { id: "human-gate", label: "Human Review Gate", description: "UI blocks merge until engineer explicitly checks each finding" },
  ],
  uc02: [
    { id: "pii-scrubber", label: "PII Scrubber", description: "Regex + NER masks emails, tokens, IPs, keys before any LLM call" },
    { id: "data-classifier", label: "Data Classification Gate", description: "Blocks cloud API if logs tagged PHI/PCI" },
    { id: "injection-guard", label: "Log Injection Guard", description: "Strips 'ignore previous instructions' patterns from log content" },
    { id: "retention-policy", label: "Retention Policy", description: "AI inputs/outputs stored ≤ 30 days, encrypted at rest" },
  ],
  uc03: [
    { id: "decision-suppression", label: "Decision Suppression", description: "System prompt explicitly forbids single recommendations" },
    { id: "uncertainty-section", label: "Mandatory Uncertainty Section", description: "Output schema requires 'WHAT I CANNOT ASSESS' section" },
    { id: "context-form", label: "Context Injection Form", description: "Engineers must fill structured context before AI is invoked" },
    { id: "adr-linkage", label: "ADR Linkage", description: "AI analysis linked to Architecture Decision Record" },
  ],
  uc04: [
    { id: "coverage-template", label: "Coverage Category Checklist", description: "Required prompt template with 6 labeled categories" },
    { id: "coverage-validator", label: "Output Coverage Validator", description: "Parses output, counts cases per category, warns if any < 3" },
    { id: "intl-checker", label: "Internationalization Checker", description: "Automated follow-up for non-Latin script inputs" },
    { id: "qa-review-gate", label: "QA Review Gate", description: "AI-generated test suites require human QA review before merge" },
  ],
  uc05: [
    { id: "security-system-prompt", label: "Security-Hardened System Prompt", description: "Applied globally to all code generation sessions" },
    { id: "sast-scan", label: "Post-Generation SAST Scan", description: "Runs Semgrep/Bandit on AI output before presenting to engineer" },
    { id: "vuln-pattern-block", label: "Vulnerability Pattern Blocklist", description: "Detects f-string SQL, eval(), shell=True in generated code" },
    { id: "ci-gate", label: "CI Pipeline Gate", description: "Same SAST checks run on AI-generated code as human code" },
  ],
  uc06: [
    { id: "source-grounding", label: "Source-Grounding Requirement", description: "Only document what is explicitly in the provided code" },
    { id: "confidence-tagging", label: "Mandatory Confidence Tags", description: "All claims require [VERIFIED] / [INFERRED] / [UNKNOWN] tags" },
    { id: "coverage-gap", label: "Coverage Gap Section", description: "Required output section listing undocumentable items" },
    { id: "human-verification", label: "Human Verification Gate", description: "[INFERRED] items must be checked off before publishing" },
  ],
  uc07: [
    { id: "no-auto-merge", label: "Hard Block on Auto-Merge", description: "AI output is advisory only — merge requires human approval" },
    { id: "risk-stratification", label: "Risk Stratification", description: "AI classifies LOW/MEDIUM/HIGH — higher risk = more reviewers" },
    { id: "scope-limits", label: "Scope Limits", description: "Billing, auth, migrations always require human-only review" },
    { id: "override-audit", label: "Override Audit Log", description: "Every human override logged with reason" },
  ],
};

// ── Main Component ────────────────────────────────────────────────────────────

export function ScenarioView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scenario = SCENARIO_LIST.find((s) => s.id === id);

  const [input, setInput] = useState(SAMPLE_INPUTS[id ?? ""] ?? "");
  const [irresponsible, setIrresponsible] = useState<PanelState>(() => makeInitialPanel(id, "irresponsible"));
  const [responsible, setResponsible] = useState<PanelState>(() => makeInitialPanel(id, "responsible"));
  const [showGuardrails, setShowGuardrails] = useState(false);

  const irresponsibleAbort = useRef<AbortController | null>(null);
  const responsibleAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    setInput(SAMPLE_INPUTS[id ?? ""] ?? "");
    setIrresponsible(makeInitialPanel(id, "irresponsible"));
    setResponsible(makeInitialPanel(id, "responsible"));
  }, [id]);

  const runPanel = useCallback(
    async (mode: "irresponsible" | "responsible") => {
      if (!id) return;

      const abort = new AbortController();
      const clearState: PanelState = { output: "", loading: true, metadata: null, durationMs: null, error: null, isExample: false };

      if (mode === "irresponsible") {
        irresponsibleAbort.current?.abort();
        irresponsibleAbort.current = abort;
        setIrresponsible(clearState);
      } else {
        responsibleAbort.current?.abort();
        responsibleAbort.current = abort;
        setResponsible(clearState);
      }

      try {
        await runScenarioStream(id, input, mode, (event) => {
          const setter = mode === "irresponsible" ? setIrresponsible : setResponsible;
          setter((prev) => {
            if (event.type === "metadata") return { ...prev, metadata: event as RunMetadata };
            if (event.type === "delta") return { ...prev, output: prev.output + (event.content ?? "") };
            if (event.type === "done") return { ...prev, loading: false, durationMs: event.durationMs ?? null };
            if (event.type === "error") return { ...prev, loading: false, error: event.message ?? "Error" };
            return prev;
          });
        }, abort.signal);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const msg = (err as Error).message;
          const setter = mode === "irresponsible" ? setIrresponsible : setResponsible;
          setter((p) => ({ ...p, loading: false, error: msg }));
        }
      }
    },
    [id, input]
  );

  const runBoth = () => {
    runPanel("irresponsible");
    runPanel("responsible");
  };

  const reset = () => {
    irresponsibleAbort.current?.abort();
    responsibleAbort.current?.abort();
    setInput(SAMPLE_INPUTS[id ?? ""] ?? "");
    setIrresponsible(makeInitialPanel(id, "irresponsible"));
    setResponsible(makeInitialPanel(id, "responsible"));
  };

  if (!scenario) {
    return (
      <div className="p-8 text-gray-500">
        Scenario not found.{" "}
        <button onClick={() => navigate("/dashboard")} className="text-blue-600 underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  const dimensionClass = DIMENSION_COLORS[scenario.dimension] ?? "text-gray-600 bg-gray-50 border-gray-200";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-3 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">{scenario.dimensionIcon}</span>
              <h1 className="text-xl font-bold text-gray-900">{scenario.title}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${dimensionClass}`}>
                {scenario.dimension}
              </span>
            </div>
            <p className="text-sm text-gray-500 max-w-2xl">{scenario.keyPrinciple}</p>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 transition-colors shadow-sm"
            >
              <RotateCcw size={14} /> Reset
            </button>
            <button
              onClick={runBoth}
              disabled={irresponsible.loading || responsible.loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors shadow-sm"
            >
              <Zap size={14} /> Run Both
            </button>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Input (editable — paste your own code or modify below)
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm font-mono text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 resize-y scrollbar-thin shadow-sm"
          placeholder="Enter your input here..."
        />
      </div>

      {/* Split Panels */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <OutputPanel
          title="❌ Irresponsible"
          mode="irresponsible"
          state={irresponsible}
          onRun={() => runPanel("irresponsible")}
          badgeColor="red"
        />
        <OutputPanel
          title="✅ Responsible"
          mode="responsible"
          state={responsible}
          onRun={() => runPanel("responsible")}
          badgeColor="green"
        />
      </div>

      {/* Key Principle Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4">
        <div className="flex items-start gap-2">
          <Shield size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Key Principle · </span>
            <span className="text-sm text-blue-800">{scenario.keyPrinciple}</span>
          </div>
        </div>
      </div>

      {/* Guardrails Expander */}
      <button
        onClick={() => setShowGuardrails(!showGuardrails)}
        className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left shadow-sm"
      >
        <span className="text-sm font-medium text-gray-700">
          🔧 Guardrails Panel — Technical Controls
        </span>
        {showGuardrails ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {showGuardrails && (
        <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <GuardrailsPanel scenarioId={id ?? ""} responsibleMetadata={responsible.metadata} />
        </div>
      )}
    </div>
  );
}

// ── Output Panel ──────────────────────────────────────────────────────────────

interface OutputPanelProps {
  title: string;
  mode: "irresponsible" | "responsible";
  state: PanelState;
  onRun: () => void;
  badgeColor: "red" | "green";
}

function OutputPanel({ title, mode, state, onRun, badgeColor }: OutputPanelProps) {
  const borderColor = badgeColor === "red" ? "border-red-200" : "border-green-200";
  const headerBg = badgeColor === "red" ? "bg-red-50" : "bg-green-50";
  const headerBorder = badgeColor === "red" ? "border-red-200" : "border-green-200";
  const buttonColor = mode === "irresponsible"
    ? "bg-red-100 hover:bg-red-200 text-red-700 border border-red-200"
    : "bg-green-100 hover:bg-green-200 text-green-700 border border-green-200";

  // Auto-scroll to the bottom of the output area while content is streaming
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.loading && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.output, state.loading]);

  return (
    <div className={`flex flex-col rounded-xl border ${borderColor} overflow-hidden shadow-sm`}>
      {/* Panel Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${headerBg} border-b ${headerBorder}`}>
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <div className="flex items-center gap-2">
          {state.durationMs !== null && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={10} />
              {(state.durationMs / 1000).toFixed(1)}s
            </span>
          )}
          <button
            onClick={onRun}
            disabled={state.loading}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${buttonColor} disabled:opacity-50`}
          >
            <Play size={10} />
            {state.loading ? "Running..." : "Run"}
          </button>
        </div>
      </div>

      {/* Metadata badges */}
      {state.metadata && mode === "responsible" && (
        <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-gray-100 bg-white">
          {state.metadata.piiRedacted && (
            <Badge color="green" icon="🧹" label={`PII Scrubbed (${state.metadata.piiCategories?.join(", ")})`} />
          )}
          {state.metadata.injectionDetected && (
            <Badge color="red" icon="🚫" label="Injection Blocked" />
          )}
          {state.metadata.guardrailsTriggered?.map((g) => (
            <Badge key={g} color="blue" icon="🛡️" label={g} />
          ))}
          {!state.metadata.piiRedacted && !state.metadata.injectionDetected && state.metadata.guardrailsTriggered?.length === 0 && (
            <Badge color="gray" icon="✓" label="No threats detected" />
          )}
        </div>
      )}

      {/* Example banner */}
      {state.isExample && !state.loading && (
        <div className="px-4 py-1.5 flex items-center gap-1.5 border-b border-amber-100 bg-amber-50">
          <BookOpen size={11} className="text-amber-600 flex-shrink-0" />
          <span className="text-xs text-amber-700">Example output — click <strong>Run</strong> for live AI response</span>
        </div>
      )}

      {/* Output */}
      <div ref={scrollRef} className="flex-1 p-4 bg-white min-h-[320px] max-h-[480px] overflow-y-auto scrollbar-thin">
        {state.error ? (
          state.error.includes("GROQ_API_KEY") || state.error.includes("console.groq") ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚙️</span>
                <span className="font-semibold text-amber-800">API Key Required</span>
              </div>
              <p className="text-amber-700 text-xs mb-3">
                The Groq API key is not configured. Follow these steps to enable live AI responses:
              </p>
              <ol className="space-y-1.5 text-xs text-gray-700 list-decimal list-inside mb-3">
                <li>Copy <code className="bg-white border border-gray-200 px-1 rounded">.env.example</code> → <code className="bg-white border border-gray-200 px-1 rounded">backend/.env</code></li>
                <li>Set <code className="bg-white border border-gray-200 px-1 rounded">GROQ_API_KEY=gsk_...</code></li>
                <li>Restart the backend server</li>
              </ol>
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 underline font-medium"
              >
                Get a free Groq API key →
              </a>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-red-600 text-sm">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span className="whitespace-pre-wrap">{state.error}</span>
            </div>
          )
        ) : state.output ? (
          <pre className={`text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed ${state.loading ? "streaming-cursor" : ""}`}>
            {state.output}
          </pre>
        ) : state.loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
            <span>Calling Groq API...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            {mode === "irresponsible" ? (
              <>
                <AlertTriangle size={28} className="text-red-300" />
                <p className="text-xs text-center text-gray-400 leading-relaxed max-w-xs">
                  No system prompt, no guardrails.<br/>
                  <span className="text-red-400">Expect: missed issues, no severity labels, no uncertainty flagging.</span>
                </p>
              </>
            ) : (
              <>
                <CheckCircle size={28} className="text-green-300" />
                <p className="text-xs text-center text-gray-400 leading-relaxed max-w-xs">
                  System prompt + active guardrails applied.<br/>
                  <span className="text-green-500">Expect: structured findings, severity labels, PII scrubbing.</span>
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Guardrails Panel ──────────────────────────────────────────────────────────

function GuardrailsPanel({ scenarioId, responsibleMetadata }: { scenarioId: string; responsibleMetadata: RunMetadata | null }) {
  const guardrails = GUARDRAILS_BY_SCENARIO[scenarioId] ?? [];
  const triggeredIds = new Set(responsibleMetadata?.guardrailsTriggered ?? []);

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        These controls are active on the <strong className="text-green-600">Responsible</strong> path only.
        Green = triggered during this run.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {guardrails.map((g) => {
          const triggered = triggeredIds.has(g.id);
          return (
            <div
              key={g.id}
              className={`p-3 rounded-lg border text-sm transition-all ${
                triggered
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={triggered ? "text-green-500" : "text-gray-300"}>
                  {triggered ? "●" : "○"}
                </span>
                <span className={`font-medium text-xs ${triggered ? "text-green-700" : "text-gray-500"}`}>
                  {g.label}
                </span>
              </div>
              <p className="text-xs text-gray-400 pl-4">{g.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function Badge({ color, icon, label }: { color: "green" | "red" | "blue" | "gray"; icon: string; label: string }) {
  const colors = {
    green: "bg-green-100 text-green-700 border-green-200",
    red: "bg-red-100 text-red-700 border-red-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    gray: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${colors[color]}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
