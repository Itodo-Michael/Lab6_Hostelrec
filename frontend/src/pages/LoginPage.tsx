// @ts-nocheck
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import Navbar from "../components/Navbar";
import { api } from "../services/api";
import { useAuthStore } from "../hooks/useAuthStore";

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setCredentials = useAuthStore((state: any) => state.setCredentials);
  const [form, setForm] = useState({ username: "", password: "", mfa_code: "" });
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Get Google auth URL
      const response = await api.get("/auth/google/url");
      const authUrl = response.data.auth_url;
      
      // Open Google auth in popup or redirect
      const popup = window.open(
        authUrl,
        "google-auth",
        "width=500,height=600,scrollbars=yes,resizable=yes"
      );
      
      if (!popup) {
        // Fallback to redirect
        window.location.href = authUrl;
        return;
      }
      
      // Listen for message from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === "GOOGLE_AUTH_SUCCESS") {
          const { access_token, role } = event.data;
          setCredentials(access_token, role);
          
          if (role === "manager" || role === "receptionist") {
            navigate("/admin");
          } else if (role === "cleaner") {
            navigate("/cleaner");
          } else {
            navigate("/customer");
          }
          
          popup.close();
          window.removeEventListener("message", handleMessage);
        } else if (event.data.type === "GOOGLE_AUTH_ERROR") {
          setError("google_auth_failed");
          popup.close();
          window.removeEventListener("message", handleMessage);
        }
      };
      
      window.addEventListener("message", handleMessage);
      
      // Check if popup is closed without auth
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleMessage);
          setLoading(false);
        }
      }, 1000);
      
    } catch (err: any) {
      console.error(err);
      setError("google_auth_failed");
      setLoading(false);
    }
  };

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("username", form.username);
      params.append("password", form.password);
      if (form.mfa_code) {
        params.append("mfa_code", form.mfa_code);
      }

      const res = await api.post("/auth/token", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      
      // Проверить, требуется ли MFA
      if (res.data.mfa_required && !form.mfa_code) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      setCredentials(res.data.access_token, res.data.role);
      if (res.data.role === "manager" || res.data.role === "receptionist") {
        navigate("/admin");
      } else if (res.data.role === "cleaner") {
        navigate("/cleaner");
      } else {
        navigate("/customer");
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        setError("invalid_credentials");
      } else {
        setError("login_failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navbar />
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-20">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          onSubmit={submit}
          className="rounded-3xl bg-white/90 backdrop-blur-md p-8 shadow-2xl border border-white/20"
        >
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          >
            {t("Sign In")}
          </motion.h2>
          <motion.input
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            type="email"
            placeholder={t("email")}
            value={form.username}
            onChange={(e: { target: { value: string } }) =>
              setForm({ ...form, username: e.target.value })
            }
            className="mt-6 w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <motion.input
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            type="password"
            placeholder={t("password")}
            value={form.password}
            onChange={(e: { target: { value: string } }) =>
              setForm({ ...form, password: e.target.value })
            }
            className="mt-3 w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {mfaRequired && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ delay: 0.1 }}
              className="mt-3"
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-slate-600 mb-2"
              >
                {t("mfa_code_required")}
              </motion.p>
              <motion.input
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                type="text"
                placeholder={t("mfa_code")}
                value={form.mfa_code}
                onChange={(e: { target: { value: string } }) =>
                  setForm({ ...form, mfa_code: e.target.value.replace(/\D/g, "").slice(0, 6) })
                }
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-center text-xl tracking-widest focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                maxLength={6}
              />
            </motion.div>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("signing_in") : t("Sign In")}
          </motion.button>
          {error && (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 rounded-xl bg-danger/10 px-4 py-2 text-danger"
            >
              {t(error)}
            </motion.p>
          )}
        </motion.form>
        
        {/* Google OAuth Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{t("or") || "or"}</span>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-3 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-gray-700 font-semibold shadow-sm hover:shadow-md hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t("continue_with_google") || "Continue with Google"}
          </motion.button>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-slate-600"
        >
          {t("no_account") || "No account yet?"}{" "}
          <Link to="/signup" className="text-accent hover:underline font-semibold">
            {t("sign Up")}
          </Link>
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-slate-600"
        >
          <Link to="/forgot-password" className="text-accent hover:underline font-semibold">
            {t("forgot_password")}
          </Link>
        </motion.p>
      </main>
    </div>
  );
};

export default LoginPage;

