import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  BarChart3,
  Trophy,
  Activity,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Calendar,
  Mail,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  role: "user" | "admin";
  created_at: string;
  last_login: string | null;
}

interface AdminQuizAttempt {
  id: string;
  user_id: string;
  username: string;
  email: string | null;
  score: number;
  total_questions: number;
  percentage: number;
  completed_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  best_percentage: number;
  attempt_count: number;
  best_score: number;
  total_questions: number;
}

type Tab = "users" | "attempts" | "leaderboard" | "activity";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + (iso.endsWith("Z") ? "" : "Z")).toLocaleString();
}

function GradeChip({ pct }: { pct: number }) {
  const color =
    pct >= 90
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : pct >= 75
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : pct >= 60
      ? "bg-purple-100 text-purple-700 border-purple-200"
      : "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
      {Math.round(pct)}%
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [attempts, setAttempts] = useState<AdminQuizAttempt[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const authHeaders = { Authorization: `Bearer ${token}` };

  const loadUsers = async () => {
    const res = await fetch("/api/admin/users", { headers: authHeaders });
    if (!res.ok) throw new Error("Failed to load users");
    const data = await res.json();
    setUsers(data.users);
  };

  const loadAttempts = async () => {
    const res = await fetch("/api/admin/quiz-attempts", { headers: authHeaders });
    if (!res.ok) throw new Error("Failed to load quiz attempts");
    const data = await res.json();
    setAttempts(data.attempts);
  };

  const loadLeaderboard = async () => {
    const res = await fetch("/api/quiz/leaderboard", { headers: authHeaders });
    if (!res.ok) throw new Error("Failed to load leaderboard");
    const data = await res.json();
    setLeaderboard(data.leaderboard);
  };

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadUsers(), loadAttempts(), loadLeaderboard()]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "users", label: "Users", icon: <Users size={15} />, count: users.length },
    { id: "attempts", label: "Quiz Scores", icon: <BarChart3 size={15} />, count: attempts.length },
    { id: "leaderboard", label: "Leaderboard", icon: <Trophy size={15} /> },
    { id: "activity", label: "Login Activity", icon: <Activity size={15} /> },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <p className="text-sm text-gray-500">
              Signed in as <span className="font-medium text-gray-700">{user?.username}</span>
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Registered Users", value: users.length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Quiz Attempts", value: attempts.length, color: "text-purple-600", bg: "bg-purple-50" },
          {
            label: "Avg Score",
            value: attempts.length
              ? `${Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)}%`
              : "—",
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-white`}>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-600 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors relative ${
                tab === t.id
                  ? "text-blue-600 bg-blue-50/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-normal">
                  {t.count}
                </span>
              )}
              {tab === t.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Users tab */}
          {tab === "users" && (
            <div className="overflow-x-auto">
              {users.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">No users yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-100">
                      <th className="text-left pb-3 pr-4 font-medium">Username</th>
                      <th className="text-left pb-3 pr-4 font-medium">Email</th>
                      <th className="text-left pb-3 pr-4 font-medium">Role</th>
                      <th className="text-left pb-3 pr-4 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/50">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {u.username[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800">{u.username}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-500">
                          <div className="flex items-center gap-1">
                            {u.email ? (
                              <>
                                <Mail size={12} className="text-gray-400" />
                                {u.email}
                              </>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                              u.role === "admin"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={11} className="text-gray-400" />
                            {fmt(u.created_at)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Quiz Attempts tab */}
          {tab === "attempts" && (
            <div className="overflow-x-auto">
              {attempts.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">No quiz attempts yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-100">
                      <th className="text-left pb-3 pr-4 font-medium">User</th>
                      <th className="text-left pb-3 pr-4 font-medium">Score</th>
                      <th className="text-left pb-3 pr-4 font-medium">Grade</th>
                      <th className="text-left pb-3 pr-4 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {attempts.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50/50">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-gray-400" />
                            <span className="font-medium text-gray-800">{a.username}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-700 font-medium">
                          {a.score} / {a.total_questions}
                        </td>
                        <td className="py-3 pr-4">
                          <GradeChip pct={a.percentage} />
                        </td>
                        <td className="py-3 pr-4 text-gray-500 text-xs">{fmt(a.completed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Leaderboard tab */}
          {tab === "leaderboard" && (
            <div>
              {leaderboard.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">
                  No quiz attempts yet — leaderboard is empty
                </p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, i) => (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-4 p-3.5 rounded-xl border ${
                        i === 0
                          ? "bg-yellow-50 border-yellow-200"
                          : i === 1
                          ? "bg-slate-50 border-slate-200"
                          : i === 2
                          ? "bg-orange-50 border-orange-200"
                          : "bg-white border-gray-100"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          i === 0
                            ? "bg-yellow-400 text-white"
                            : i === 1
                            ? "bg-slate-400 text-white"
                            : i === 2
                            ? "bg-orange-400 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                      </div>

                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 text-sm">{entry.username}</div>
                        <div className="text-xs text-gray-500">
                          {entry.attempt_count} attempt{entry.attempt_count !== 1 ? "s" : ""} ·{" "}
                          best {entry.best_score}/{entry.total_questions}
                        </div>
                      </div>

                      {/* Score bar */}
                      <div className="w-32 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-400 rounded-full"
                            style={{ width: `${entry.best_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-8 text-right">
                          {Math.round(entry.best_percentage)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Login Activity tab */}
          {tab === "activity" && (
            <div className="overflow-x-auto">
              {users.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">No users yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-100">
                      <th className="text-left pb-3 pr-4 font-medium">Username</th>
                      <th className="text-left pb-3 pr-4 font-medium">Role</th>
                      <th className="text-left pb-3 pr-4 font-medium">Registered</th>
                      <th className="text-left pb-3 pr-4 font-medium">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users
                      .slice()
                      .sort((a, b) => {
                        if (!a.last_login) return 1;
                        if (!b.last_login) return -1;
                        return new Date(b.last_login).getTime() - new Date(a.last_login).getTime();
                      })
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50/50">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                {u.username[0].toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-800">{u.username}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                u.role === "admin"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-gray-500 text-xs">{fmt(u.created_at)}</td>
                          <td className="py-3 pr-4">
                            {u.last_login ? (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                {fmt(u.last_login)}
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs">Never logged in</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
