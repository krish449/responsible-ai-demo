import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./components/LoginPage";
import { RegisterPage } from "./components/RegisterPage";
import { AdminDashboard } from "./components/AdminDashboard";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { ScenarioView } from "./components/ScenarioView";
import { ChatbotView } from "./components/ChatbotView";
import { Charter } from "./components/Charter";
import { Scorecard } from "./components/Scorecard";
import { Quiz } from "./components/Quiz";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes — require login */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="flex h-screen bg-gray-50 overflow-hidden">
                    <Sidebar />
                    <main className="flex-1 overflow-y-auto scrollbar-thin bg-gray-50">
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/scenario/:id" element={<ScenarioView />} />
                        <Route path="/chatbot" element={<ChatbotView />} />
                        <Route path="/charter" element={<Charter />} />
                        <Route path="/scorecard" element={<Scorecard />} />
                        <Route path="/quiz" element={<Quiz />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                      </Routes>
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
