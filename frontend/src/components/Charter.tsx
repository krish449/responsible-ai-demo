import { FileText, CheckCircle, XCircle, Shield, AlertTriangle, ChevronRight } from "lucide-react";

export function Charter() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <FileText size={24} className="text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Usage Charter</h1>
          <p className="text-gray-500 text-sm">Engineering Team — v1.0</p>
        </div>
      </div>

      {/* Purpose */}
      <Section title="Purpose">
        <p className="text-sm text-gray-600 leading-relaxed">
          This charter governs the use of AI-assisted tools in our engineering workflows. It applies
          to all engineers, QA, architects, and leads. AI assistance does not transfer accountability —
          the engineer who reviews and approves AI output is responsible for it.
        </p>
      </Section>

      {/* Approved Use Cases */}
      <Section title="✅ Approved Use Cases">
        <ul className="space-y-2">
          {APPROVED.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <CheckCircle size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Prohibited */}
      <Section title="❌ Prohibited Use Cases">
        <ul className="space-y-2">
          {PROHIBITED.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <XCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Data Handling */}
      <Section title="🔐 Data Handling Rules">
        {DATA_RULES.map((rule) => (
          <div key={rule.title} className="flex gap-3 mb-3">
            <span className="text-xs font-mono font-bold text-blue-600 w-6 flex-shrink-0 mt-0.5">{rule.num}</span>
            <div>
              <span className="text-sm font-medium text-gray-900">{rule.title} — </span>
              <span className="text-sm text-gray-600">{rule.desc}</span>
            </div>
          </div>
        ))}
      </Section>

      {/* Human Oversight */}
      <Section title="👤 Human Oversight Requirements">
        <ul className="space-y-2">
          {OVERSIGHT.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <Shield size={14} className="text-purple-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Escalation */}
      <Section title="🚨 Escalation Path">
        <div className="space-y-3">
          {ESCALATION.map((step) => (
            <div key={step.trigger} className="flex gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="text-amber-700 font-medium">IF </span>
                <span className="text-gray-700">{step.trigger}</span>
                <ChevronRight size={12} className="inline text-gray-400 mx-1" />
                <span className="text-gray-900 font-medium">{step.action}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Footer */}
      <div className="mt-8 p-4 border border-dashed border-gray-300 rounded-xl text-center bg-white">
        <p className="text-sm text-gray-600">
          <strong className="text-gray-900">Accountability Statement:</strong>{" "}
          The engineer who reviews and approves AI output is accountable for it.
          AI assistance does not transfer ownership. You sign your name on it.
        </p>
        <div className="mt-4 flex justify-center gap-8 text-xs text-gray-400">
          <div>Charter Owner: <span className="text-gray-500">Engineering Lead</span></div>
          <div>Last Reviewed: <span className="text-gray-500">Feb 2026</span></div>
          <div>Version: <span className="text-gray-500">1.0</span></div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
        {title}
      </h2>
      {children}
    </div>
  );
}

const APPROVED = [
  "Code review assistance (advisory only — human approval required)",
  "Test case generation (with required coverage category review)",
  "Documentation drafting (from source code only, human-verified before publishing)",
  "Architecture tradeoff analysis (input to human decision, not a decision)",
  "Incident log analysis (on pre-scrubbed, non-sensitive log data only)",
  "Boilerplate and scaffolding code generation (with SAST review)",
  "Summarization of internal technical documents",
  "Drafting — not finalizing — RFCs, ADRs, and runbooks",
];

const PROHIBITED = [
  "Autonomous code merging or deployment decisions",
  "Processing raw logs containing PII/PHI/PCI via cloud AI APIs without prior scrubbing",
  "Final architectural or vendor decisions made solely on AI output",
  "Sending customer data, credentials, or internal IP to AI APIs",
  "Using AI output as the sole basis for security sign-off",
  "Generating security policies, compliance certifications, or legal text",
  "Automated responses to customers or external parties",
];

const DATA_RULES = [
  { num: "1.", title: "SCRUB BEFORE SENDING", desc: "Run PII scrubber on all log/data inputs before any AI call." },
  { num: "2.", title: "CLASSIFY FIRST", desc: "PHI, PCI, or SOC2-sensitive data must only go to on-prem/private AI." },
  { num: "3.", title: "MINIMIZE", desc: "Send only the data the AI needs for the task." },
  { num: "4.", title: "RETAIN RESPONSIBLY", desc: "AI input/output logs retained ≤ 30 days, encrypted, access-controlled." },
  { num: "5.", title: "NO CREDENTIALS", desc: "Never paste API keys, passwords, tokens, or secrets into AI prompts." },
];

const OVERSIGHT = [
  "An engineer must explicitly review and approve all AI-generated code before commit. 'AI wrote it' is not a defense.",
  "Architecture decisions require a named human decision-maker in the ADR.",
  "AI-generated documentation must be human-verified before publication.",
  "Any AI output labeled [INFERRED] or [UNCERTAIN] requires explicit human sign-off before use.",
  "Security-related changes always require human security review regardless of AI analysis.",
];

const ESCALATION = [
  { trigger: "AI output is uncertain or contradictory", action: "Do not use the output. Escalate to a senior engineer." },
  { trigger: "AI output touches security, compliance, or customer data", action: "Escalate to Security Lead before acting." },
  { trigger: "AI output causes a production incident", action: "Flag in post-mortem. Document in AI risk register." },
  { trigger: "You suspect the AI is hallucinating facts or citations", action: "Verify against primary sources. Never ship unverified AI claims." },
];
