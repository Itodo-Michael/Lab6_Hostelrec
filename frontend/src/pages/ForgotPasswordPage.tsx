// @ts-nocheck
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import Navbar from "../components/Navbar";
import { api } from "../services/api";

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await api.post("/auth/forgot-password", {
        email: email,
      });
      
      setSuccess("reset_code_sent");
      setStep("reset");
    } catch (err: any) {
      console.error(err);
      setError("reset_request_failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Валидация
    if (newPassword !== confirmPassword) {
      setError("passwords_do_not_match");
      return;
    }

    if (newPassword.length < 6) {
      setError("password_too_short");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/reset-password", {
        email: email,
        code: code,
        new_password: newPassword,
      });
      
      setSuccess("password_reset_successful");
      // Перенаправить на страницу входа через 2 секунды
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 400) {
        setError(err.response?.data?.detail || "invalid_reset_code");
      } else {
        setError("password_reset_failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navbar />
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-20">
        {step === "request" ? (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onSubmit={handleRequestReset}
            className="rounded-3xl bg-white/90 backdrop-blur-md p-8 shadow-2xl border border-white/20"
          >
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            >
              {t("forgot_password")}
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-sm text-slate-600"
            >
              {t("forgot_password_description")}
            </motion.p>

            <motion.input
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              type="email"
              placeholder={t("email")}
              value={email}
              onChange={(e: { target: { value: string } }) =>
                setEmail(e.target.value)
              }
              className="mt-6 w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              required
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 rounded-xl bg-danger/10 px-4 py-2 text-danger text-sm"
              >
                {t(error)}
              </motion.p>
            )}

            {success && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 rounded-xl bg-green-500/10 px-4 py-2 text-green-600 text-sm"
              >
                {t(success)}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("sending") : t("send_reset_code")}
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-center text-sm text-slate-600"
            >
              {t("remember_password")}{" "}
              <Link to="/login" className="text-accent hover:underline font-semibold">
                {t("Sign In")}
              </Link>
            </motion.p>
          </motion.form>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onSubmit={handleResetPassword}
            className="rounded-3xl bg-white/90 backdrop-blur-md p-8 shadow-2xl border border-white/20"
          >
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            >
              {t("reset_password")}
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-sm text-slate-600"
            >
              {t("reset_password_description")}
            </motion.p>

            <motion.input
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              type="text"
              placeholder={t("reset_code")}
              value={code}
              onChange={(e: { target: { value: string } }) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))
              }
              className="mt-6 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-center text-xl tracking-widest focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              maxLength={8}
              required
            />

            <motion.input
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              type="password"
              placeholder={t("new_password")}
              value={newPassword}
              onChange={(e: { target: { value: string } }) =>
                setNewPassword(e.target.value)
              }
              className="mt-3 w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              required
              minLength={6}
            />

            <motion.input
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              type="password"
              placeholder={t("confirm_password")}
              value={confirmPassword}
              onChange={(e: { target: { value: string } }) =>
                setConfirmPassword(e.target.value)
              }
              className="mt-3 w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              required
              minLength={6}
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 rounded-xl bg-danger/10 px-4 py-2 text-danger text-sm"
              >
                {t(error)}
              </motion.p>
            )}

            {success && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 rounded-xl bg-green-500/10 px-4 py-2 text-green-600 text-sm"
              >
                {t(success)}
              </motion.p>
            )}

            <div className="flex gap-3 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  setStep("request");
                  setCode("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError(null);
                  setSuccess(null);
                }}
                className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
              >
                {t("back")}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || code.length !== 8}
                className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t("resetting") : t("reset_password")}
              </motion.button>
            </div>
          </motion.form>
        )}
      </main>
    </div>
  );
};

export default ForgotPasswordPage;



