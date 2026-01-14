// @ts-nocheck
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import Navbar from "../components/Navbar";
import { api } from "../services/api";

const MFAPage = () => {
  const { t } = useTranslation();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [step, setStep] = useState<"main" | "enable" | "verify" | "disable">("main");

  useEffect(() => {
    loadMFAStatus();
  }, []);

  const loadMFAStatus = async () => {
    try {
      const res = await api.get("/auth/me");
      setMfaEnabled(res.data.mfa_enabled || false);
    } catch (err) {
      console.error("Failed to load MFA status:", err);
    }
  };

  const handleEnableMFA = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await api.post("/auth/mfa/enable", {
        password: password,
      });
      
      setSuccess("mfa_enabled_successfully");
      setMfaEnabled(true);
      setStep("main");
      setPassword("");
      await loadMFAStatus();
      
      // В реальном приложении здесь бы был секретный ключ для QR-кода
      console.log("MFA Secret:", res.data.secret);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 400) {
        setError(err.response?.data?.detail || "invalid_password");
      } else {
        setError("mfa_enable_failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await api.post("/auth/mfa/verify", {
        code: mfaCode,
      });
      
      setSuccess("mfa_code_verified");
      setMfaCode("");
      setStep("main");
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 400) {
        setError(err.response?.data?.detail || "invalid_mfa_code");
      } else {
        setError("mfa_verify_failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await api.post("/auth/mfa/disable", {
        password: password,
      });
      
      setSuccess("mfa_disabled_successfully");
      setMfaEnabled(false);
      setStep("main");
      setPassword("");
      await loadMFAStatus();
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 400) {
        setError(err.response?.data?.detail || "invalid_password");
      } else {
        setError("mfa_disable_failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navbar />
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-20">
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
            className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          >
            {t("mfa_settings")}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 text-sm text-slate-600"
          >
            {t("mfa_description")}
          </motion.p>

          {step === "main" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 space-y-4"
            >
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                <div>
                  <p className="font-semibold">{t("mfa_status")}</p>
                  <p className="text-sm text-slate-600">
                    {mfaEnabled ? t("enabled") : t("disabled")}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  mfaEnabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {mfaEnabled ? t("enabled") : t("disabled")}
                </div>
              </div>

              {!mfaEnabled ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep("enable")}
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {t("enable_mfa")}
                </motion.button>
              ) : (
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep("verify")}
                    className="w-full rounded-xl bg-blue-500 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {t("verify_mfa_code")}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep("disable")}
                    className="w-full rounded-xl bg-red-500 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {t("disable_mfa")}
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {step === "enable" && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleEnableMFA}
              className="mt-6 space-y-4"
            >
              <p className="text-sm text-slate-600">{t("mfa_enable_description")}</p>
              <input
                type="password"
                placeholder={t("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("main");
                    setPassword("");
                    setError(null);
                  }}
                  className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loading ? t("enabling") : t("enable")}
                </button>
              </div>
            </motion.form>
          )}

          {step === "verify" && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleVerifyMFA}
              className="mt-6 space-y-4"
            >
              <p className="text-sm text-slate-600">{t("mfa_verify_description")}</p>
              <input
                type="text"
                placeholder={t("mfa_code")}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-center text-2xl tracking-widest focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                maxLength={6}
                required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("main");
                    setMfaCode("");
                    setError(null);
                  }}
                  className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="flex-1 rounded-xl bg-blue-500 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loading ? t("verifying") : t("verify")}
                </button>
              </div>
            </motion.form>
          )}

          {step === "disable" && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleDisableMFA}
              className="mt-6 space-y-4"
            >
              <p className="text-sm text-slate-600">{t("mfa_disable_description")}</p>
              <input
                type="password"
                placeholder={t("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("main");
                    setPassword("");
                    setError(null);
                  }}
                  className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-red-500 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loading ? t("disabling") : t("disable")}
                </button>
              </div>
            </motion.form>
          )}

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
        </motion.div>
      </main>
    </div>
  );
};

export default MFAPage;

