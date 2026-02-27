import { useState, useEffect } from "react";
import { BarChart3, RefreshCw, Trash2, Shield, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { fetchAuditLog, clearAuditLog } from "../services/api";
import type { AuditEntry, AuditStats } from "../types";

export function Scorecard() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLog();
      setEntries(data.entries);
      setStats(data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleClear = async () => {
    await clearAuditLog();
    await load();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <BarChart3 size={24} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Scorecard</h1>
            <p className="text-gray-500 text-sm">Live audit trail from this demo session</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleClear} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors">
            <Trash2 size={14} /> Clear Log
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <StatCard label="Total Runs" value={stats.total} icon={<BarChart3 size={16} />} color="blue" />
          <StatCard label="Responsible" value={stats.responsible} icon={<CheckCircle size={16} />} color="green" />
          <StatCard label="Irresponsible" value={stats.irresponsible} icon={<AlertTriangle size={16} />} color="red" />
          <StatCard label="Injections Blocked" value={stats.injectionAttempts} icon={<Shield size={16} />} color="purple" />
          <StatCard label="PII Redactions" value={stats.piiRedactions} icon={<Shield size={16} />} color="orange" />
          <StatCard label="Avg Latency" value={`${(stats.avgDurationMs / 1000).toFixed(1)}s`} icon={<Clock size={16} />} color="gray" />
        </div>
      )}

      {/* Risk Exposure Summary */}
      {stats && stats.total > 0 && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Risk Exposure Summary</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {stats.irresponsible > 0 && (
              <RiskItem
                label={`${stats.irresponsible} irresponsible path runs`}
                detail="Each represents a risk that guardrails would have prevented"
                severity="high"
              />
            )}
            {stats.injectionAttempts > 0 && (
              <RiskItem
                label={`${stats.injectionAttempts} prompt injection attempts`}
                detail="Would have succeeded without the injection guard"
                severity="high"
              />
            )}
            {stats.piiRedactions > 0 && (
              <RiskItem
                label={`${stats.piiRedactions} PII data items scrubbed`}
                detail="Would have left your network without the PII scrubber"
                severity="medium"
              />
            )}
            {stats.humanReviewRequired > 0 && (
              <RiskItem
                label={`${stats.humanReviewRequired} outputs flagged for human review`}
                detail="High-stakes outputs that require an engineer to sign off"
                severity="low"
              />
            )}
          </div>
        </div>
      )}

      {/* Audit Log */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Audit Log ({entries.length} entries)
        </h2>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BarChart3 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No entries yet. Run some scenarios to see the audit trail.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    red: "text-red-600 bg-red-50",
    purple: "text-purple-600 bg-purple-50",
    orange: "text-orange-600 bg-orange-50",
    gray: "text-gray-600 bg-gray-100",
  };
  return (
    <div className={`p-3 rounded-xl border border-gray-200 ${colors[color] || colors.gray}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-70">{icon}<span className="text-xs">{label}</span></div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function RiskItem({ label, detail, severity }: { label: string; detail: string; severity: "high" | "medium" | "low" }) {
  const colors = { high: "border-red-200 bg-red-50", medium: "border-yellow-200 bg-yellow-50", low: "border-blue-200 bg-blue-50" };
  const textColors = { high: "text-red-700", medium: "text-yellow-700", low: "text-blue-700" };
  return (
    <div className={`p-3 rounded-lg border ${colors[severity]}`}>
      <div className={`text-sm font-medium ${textColors[severity]}`}>{label}</div>
      <div className="text-xs text-gray-500 mt-0.5">{detail}</div>
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const isResp = entry.verdict === "RESPONSIBLE";
  return (
    <div className={`flex gap-3 p-3 rounded-xl border text-xs transition-colors ${
      isResp ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
    }`}>
      <div className={`mt-0.5 ${isResp ? "text-green-600" : "text-red-600"}`}>
        {isResp ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-gray-900">{entry.scenarioTitle}</span>
          <span className={`px-1.5 py-0.5 rounded text-xs ${isResp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {entry.verdict}
          </span>
          {entry.injectionDetected && <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">INJECTION</span>}
          {entry.piiRedacted && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">PII SCRUBBED</span>}
        </div>
        <div className="text-gray-500 truncate">{entry.promptSummary}</div>
      </div>
      <div className="text-right flex-shrink-0 text-gray-400">
        <div>{new Date(entry.timestamp).toLocaleTimeString()}</div>
        <div>{entry.durationMs}ms</div>
      </div>
    </div>
  );
}
