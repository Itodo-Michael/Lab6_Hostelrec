// @ts-nocheck
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import Navbar from "../components/Navbar";
import { api } from "../services/api";

type Session = {
  id: number;
  created_at: string;
  last_activity: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  is_current: boolean;
};

const SessionsPage = () => {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/sessions");
      setSessions(res.data);
    } catch (err: any) {
      console.error(err);
      setError("failed_to_load_sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async (sessionId: number) => {
    if (!confirm(t("end_session_confirm"))) {
      return;
    }

    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      await loadSessions();
    } catch (err: any) {
      console.error(err);
      alert(t("failed_to_end_session"));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getUserAgentInfo = (userAgent: string | null) => {
    if (!userAgent) return t("unknown");
    
    // Простой парсинг User-Agent
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return userAgent.substring(0, 50) + "...";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl bg-white/90 backdrop-blur-md p-8 shadow-2xl border border-white/20"
        >
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-6"
          >
            {t("active_sessions")}
          </motion.h2>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-slate-600">{t("loading")}</p>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-danger/10 px-4 py-2 text-danger">
              {t(error)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600">{t("no_active_sessions")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`rounded-xl p-4 border-2 ${
                    session.is_current
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-primary">
                          {session.is_current ? t("current_session") : t("session")} #{session.id}
                        </h3>
                        {session.is_current && (
                          <span className="px-2 py-1 rounded-full bg-primary text-white text-xs font-semibold">
                            {t("current")}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                        <div>
                          <span className="font-semibold">{t("ip_address")}:</span>{" "}
                          {session.ip_address || t("unknown")}
                        </div>
                        <div>
                          <span className="font-semibold">{t("device")}:</span>{" "}
                          {getUserAgentInfo(session.user_agent)}
                        </div>
                        <div>
                          <span className="font-semibold">{t("created_at")}:</span>{" "}
                          {formatDate(session.created_at)}
                        </div>
                        <div>
                          <span className="font-semibold">{t("last_activity")}:</span>{" "}
                          {formatDate(session.last_activity)}
                        </div>
                        <div>
                          <span className="font-semibold">{t("expires_at")}:</span>{" "}
                          {formatDate(session.expires_at)}
                        </div>
                      </div>
                    </div>
                    {!session.is_current && (
                      <button
                        onClick={() => handleEndSession(session.id)}
                        className="ml-4 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all"
                      >
                        {t("end_session")}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default SessionsPage;



