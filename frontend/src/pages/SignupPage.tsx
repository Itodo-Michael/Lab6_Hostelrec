import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Navbar from "../components/Navbar";
import { api } from "../services/api";
import { useAuthStore } from "../hooks/useAuthStore";

const SignupPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setCredentials = useAuthStore((state: any) => state.setCredentials);
  const [form, setForm] = useState({ email: "", full_name: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/signup", {
        email: form.email,
        full_name: form.full_name,
        password: form.password
      });
      setCredentials(res.data.access_token, res.data.role);
      if (res.data.role === "manager" || res.data.role === "receptionist") {
        navigate("/admin");
      } else if (res.data.role === "cleaner") {
        navigate("/cleaner");
      } else {
        navigate("/customer");
      }
    } catch (err) {
      console.error(err);
      setError("signup_failed");
    }
  };

  return (
    <div className="space-y-10">
      <Navbar />
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4">
        <form onSubmit={submit} className="rounded-3xl bg-white p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-primary">{t("signup")}</h2>
          <input
            type="email"
            placeholder={t("email")}
            value={form.email}
            onChange={(e: { target: { value: string } }) =>
              setForm({ ...form, email: e.target.value })
            }
            className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3"
          />
          <input
            type="text"
            placeholder={t("full_name")}
            value={form.full_name}
            onChange={(e: { target: { value: string } }) =>
              setForm({ ...form, full_name: e.target.value })
            }
            className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3"
          />
          <input
            type="password"
            placeholder={t("password")}
            value={form.password}
            onChange={(e: { target: { value: string } }) =>
              setForm({ ...form, password: e.target.value })
            }
            className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3"
          />
          <button className="mt-6 w-full rounded-xl bg-primary py-3 text-white">
            {t("signup")}
          </button>
          {error && (
            <p className="mt-4 rounded-xl bg-danger/10 px-4 py-2 text-danger">
              {t(error)}
            </p>
          )}
        </form>
      </main>
    </div>
  );
};

export default SignupPage;


