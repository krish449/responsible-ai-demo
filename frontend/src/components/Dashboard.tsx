import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight, AlertTriangle, CheckCircle } from "lucide-react";

const DIMENSIONS = [
  { label: "Transparency", icon: "🔍", color: "blue", scenarios: ["uc01"], description: "AI must show its reasoning" },
  { label: "Privacy & Data Safety", icon: "🔐", color: "green", scenarios: ["uc02"], description: "Minimize data sent to AI" },
  { label: "Human Oversight", icon: "🏗️", color: "purple", scenarios: ["uc03", "uc07"], description: "Humans stay in control" },
  { label: "Fairness & Bias", icon: "⚖️", color: "orange", scenarios: ["uc04"], description: "AI reflects training biases" },
  { label: "Security", icon: "🛡️", color: "red", scenarios: ["uc05"], description: "Never generate insecure code silently" },
  { label: "Accuracy & Hallucination", icon: "🌀", color: "yellow", scenarios: ["uc06", "uc08"], description: "Acknowledge uncertainty explicitly" },
];

const SCENARIO_CARDS = [
  { id: "uc01", title: "Code Review Assistant", dimension: "Transparency", icon: "🔍", badge: "UC-01" },
  { id: "uc02", title: "Incident Log Analyzer", dimension: "Privacy", icon: "🔐", badge: "UC-02" },
  { id: "uc03", title: "Architecture Assistant", dimension: "Human Oversight", icon: "🏗️", badge: "UC-03" },
  { id: "uc04", title: "Test Case Generator", dimension: "Fairness & Bias", icon: "⚖️", badge: "UC-04" },
  { id: "uc05", title: "Secure Code Generation", dimension: "Security", icon: "🛡️", badge: "UC-05" },
  { id: "uc06", title: "API Doc Generator", dimension: "Hallucination", icon: "🌀", badge: "UC-06" },
  { id: "uc07", title: "PR Merge Gating", dimension: "Human Oversight", icon: "🚦", badge: "UC-07" },
];

const DIMENSION_BG: Record<string, string> = {
  blue: "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100/60",
  green: "bg-green-50 border-green-200 hover:border-green-400 hover:bg-green-100/60",
  purple: "bg-purple-50 border-purple-200 hover:border-purple-400 hover:bg-purple-100/60",
  orange: "bg-orange-50 border-orange-200 hover:border-orange-400 hover:bg-orange-100/60",
  red: "bg-red-50 border-red-200 hover:border-red-400 hover:bg-red-100/60",
  yellow: "bg-yellow-50 border-yellow-200 hover:border-yellow-400 hover:bg-yellow-100/60",
};

const DIMENSION_LABEL: Record<string, string> = {
  blue: "text-blue-700",
  green: "text-green-700",
  purple: "text-purple-700",
  orange: "text-orange-700",
  red: "text-red-700",
  yellow: "text-yellow-700",
};

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Responsible AI Demo</h1>
            <p className="text-gray-500 text-sm">Engineering Team Workshop</p>
          </div>
        </div>

        <p className="text-gray-600 text-sm max-w-2xl leading-relaxed mt-4">
          This demo showcases <span className="text-gray-900 font-medium">what responsible AI usage looks like in practice</span> —
          and what it doesn't. Each scenario shows an irresponsible ❌ and a responsible ✅ version of the same task,
          with real Groq API calls so you can see the difference live.
        </p>

        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-1.5 text-red-600">
            <AlertTriangle size={14} />
            <span>8 failure modes demonstrated</span>
          </div>
          <div className="flex items-center gap-1.5 text-green-600">
            <CheckCircle size={14} />
            <span>8 guardrail patterns implemented</span>
          </div>
        </div>
      </div>

      {/* Dimension Grid */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Responsibility Dimensions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {DIMENSIONS.map((d) => (
            <div
              key={d.label}
              onClick={() => d.scenarios[0] && navigate(`/scenario/${d.scenarios[0]}`)}
              className={`border rounded-xl p-4 cursor-pointer transition-all shadow-sm ${DIMENSION_BG[d.color]}`}
            >
              <div className="text-2xl mb-2">{d.icon}</div>
              <div className={`font-semibold text-sm ${DIMENSION_LABEL[d.color]}`}>{d.label}</div>
              <div className="text-xs text-gray-500 mt-1">{d.description}</div>
              <div className="mt-2 text-xs text-gray-400">
                {d.scenarios.length} scenario{d.scenarios.length > 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scenario List */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Use Cases (UC-01 – UC-07)
        </h2>
        <div className="space-y-2">
          {SCENARIO_CARDS.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/scenario/${s.id}`)}
              className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all text-left group shadow-sm"
            >
              <span className="text-xl">{s.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{s.badge}</span>
                  <span className="text-sm font-medium text-gray-900">{s.title}</span>
                </div>
                <span className="text-xs text-gray-400">{s.dimension}</span>
              </div>
              <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>
          ))}
        </div>
      </section>

      {/* Capstone CTA */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Capstone — UC-08
        </h2>
        <button
          onClick={() => navigate("/chatbot")}
          className="w-full p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all text-left group shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
              🤖
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold">Engineering Assistant Chatbot</div>
              <div className="text-sm text-blue-100 mt-1">
                All 6 responsibility dimensions in one interactive demo. Compare irresponsible vs responsible chatbot side-by-side.
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {["Injection Defense", "Source Attribution", "Destructive Gate", "Session Isolation"].map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <ArrowRight size={20} className="text-white group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </section>

      {/* Footer quote */}
      <div className="mt-10 p-4 border border-dashed border-gray-300 rounded-xl text-center bg-white">
        <p className="text-gray-500 text-sm italic">
          "The engineer who reviews and approves AI output is accountable for it.{" "}
          <span className="text-gray-800 font-medium">AI assistance does not transfer ownership.</span>"
        </p>
        <p className="text-gray-400 text-xs mt-1">— AI Usage Charter</p>
      </div>
    </div>
  );
}
