// @ts-nocheck
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import Navbar from "../components/Navbar";
import { api } from "../services/api";
import { useAuthStore } from "../hooks/useAuthStore";

const PasswordChangePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((state: any) => state.logout);
  const [form, setForm] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Валидация
    if (form.new_password !== form.confirm_password) {
      setError("passwords_do_not_match");
      return;
    }

    if (form.new_password.length < 6) {
      setError("password_too_short");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        old_password: form.old_password,
        new_password: form.new_password,
      });
      
      setSuccess(true);
      // Выйти из системы через 2 секунды
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 400) {
        setError(err.response?.data?.detail || "invalid_old_password");
      } else {
        setError("password_change_failed");
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
            {t("change_password")}
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 text-sm text-slate-600"
          >
            {t("change_password_description")}
          </motion.p>

          <motion.input
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            type="password"
            placeholder={t("old_password")}
            value={form.old_password}
            onChange={(e: { target: { value: string } }) =>
              setForm({ ...form, old_password: e.target.value })
            }
            className="mt-6 w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            required
          />

          <motion.input
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            type="password"
            placeholder={t("new_password")}
            value={form.new_password}
            onChange={(e: { target: { value: string } }) =>
              setForm({ ...form, new_password: e.target.value })
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
            value={form.confirm_password}
            onChange={(e: { target: { value: string } }) =>
              setForm({ ...form, confirm_password: e.target.value })
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
              {t("password_changed_successfully")}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("changing") : t("change_password")}
          </motion.button>
        </motion.form>
      </main>
    </div>
  );
};

export default PasswordChangePage;



