import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "../services/api";
import { useAuthStore } from "../hooks/useAuthStore";

type ApiKey = {
  integration_name: string;
  api_key: string;
};

const SecurityPage = () => {
  const { t } = useTranslation();
  const role = useAuthStore((state: any) => state.role);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reveal = async (e: any) => {
    e.preventDefault();
    try {
      const res = await api.get<ApiKey[]>("/admin/security/api-keys", { params: { secret_phrase: secret } });
      setKeys(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Invalid secret phrase");
    }
  };

  if (role !== "manager") {
    return <div className="rounded-2xl bg-white p-6 shadow">{t("manager_only")}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-primary">{t("security_center")}</h2>
      <form onSubmit={reveal} className="flex gap-3">
        <input
          type="password"
          placeholder={t("secret_phrase")}
          value={secret}
          onChange={(e: any) => setSecret(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2"
        />
        <button className="rounded-xl bg-primary px-6 py-2 text-white">{t("reveal_keys")}</button>
      </form>
      {error && <p className="rounded-xl bg-danger/10 px-4 py-2 text-danger">{t("invalid_secret")}</p>}
      <div className="space-y-3">
        {keys.map((entry) => (
          <div key={entry.integration_name} className="rounded-2xl bg-white p-4 shadow">
            <p className="text-sm font-semibold uppercase text-slate-500">{entry.integration_name}</p>
            <p className="text-xl font-mono">{entry.api_key}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SecurityPage;

