import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Shield,
  FileText,
  BarChart3,
  MessageSquare,
  ChevronRight,
  GraduationCap,
  ShieldCheck,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const SCENARIOS = [
  { id: "uc01", title: "Code Review Assistant", icon: "🔍", dimension: "Transparency" },
  { id: "uc02", title: "Incident Log Analyzer", icon: "🔐", dimension: "Privacy" },
  { id: "uc03", title: "Architecture Assistant", icon: "🏗️", dimension: "Human Oversight" },
  { id: "uc04", title: "Test Case Generator", icon: "⚖️", dimension: "Fairness" },
  { id: "uc05", title: "Secure Code Gen", icon: "🛡️", dimension: "Security" },
  { id: "uc06", title: "Doc Generator", icon: "🌀", dimension: "Hallucination" },
  { id: "uc07", title: "PR Merge Gating", icon: "🚦", dimension: "Human Oversight" },
];

const DIMENSION_COLORS: Record<string, string> = {
  Transparency: "text-blue-400",
  Privacy: "text-emerald-400",
  "Human Oversight": "text-purple-400",
  Fairness: "text-orange-400",
  Security: "text-red-400",
  Hallucination: "text-yellow-400",
};

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm">
            🛡️
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Responsible AI</h1>
            <p className="text-xs text-slate-400">Engineering Demo</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-0.5">
        {/* Main nav */}
        <NavItem to="/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" />

        {/* Scenarios */}
        <div className="pt-4 pb-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">
            Use Cases
          </p>
        </div>

        {SCENARIOS.map((s) => (
          <NavLink
            key={s.id}
            to={`/scenario/${s.id}`}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all group ${
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`
            }
          >
            <span className="text-base w-5 text-center">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-medium">{s.title}</div>
              <div className={`text-xs ${DIMENSION_COLORS[s.dimension] || "text-slate-500"} opacity-80`}>
                {s.dimension}
              </div>
            </div>
            {location.pathname === `/scenario/${s.id}` && (
              <ChevronRight size={12} className="text-slate-400" />
            )}
          </NavLink>
        ))}

        {/* Capstone */}
        <div className="pt-4 pb-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">
            Capstone
          </p>
        </div>

        <NavLink
          to="/chatbot"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              isActive
                ? "bg-blue-600/30 border border-blue-500/40 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`
          }
        >
          <MessageSquare size={16} />
          <div className="flex-1">
            <div className="text-xs font-medium">Engineering Chatbot</div>
            <div className="text-xs text-blue-400">UC-08 · Capstone</div>
          </div>
        </NavLink>

        {/* Bottom nav */}
        <div className="pt-4 pb-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">
            Resources
          </p>
        </div>
        <NavItem to="/charter" icon={<FileText size={16} />} label="AI Usage Charter" />
        <NavItem to="/scorecard" icon={<BarChart3 size={16} />} label="Team Scorecard" />

        {/* Quiz */}
        <div className="pt-4 pb-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">
            Knowledge Check
          </p>
        </div>
        <NavLink
          to="/quiz"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              isActive
                ? "bg-indigo-600/30 border border-indigo-500/40 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`
          }
        >
          <GraduationCap size={16} />
          <div className="flex-1">
            <div className="text-xs font-medium">Responsible AI Quiz</div>
            <div className="text-xs text-indigo-400">20 questions · All dimensions</div>
          </div>
        </NavLink>

        {/* Admin link (only visible to admins) */}
        {user?.role === "admin" && (
          <>
            <div className="pt-4 pb-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">
                Admin
              </p>
            </div>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-amber-600/20 border border-amber-500/30 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`
              }
            >
              <ShieldCheck size={16} />
              <div className="flex-1">
                <div className="text-xs font-medium">Admin Dashboard</div>
                <div className="text-xs text-amber-400">Users · Scores · Logs</div>
              </div>
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer — user info + logout */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        {/* Current user */}
        <div className="flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.username?.[0]?.toUpperCase() ?? <User size={12} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-200 truncate">{user?.username}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email ?? user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <LogOut size={13} />
          </button>
        </div>

        {/* Model badge */}
        <div className="flex items-center gap-2 px-1">
          <Shield size={12} className="text-emerald-400" />
          <span className="text-xs text-slate-500">Groq · llama-3.3-70b</span>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
          isActive
            ? "bg-slate-700 text-white"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
