import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "../services/api";
import { useAuthStore } from "../hooks/useAuthStore";

type AuditLog = {
  event_time: string;
  username: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  details: string;
};

const badgeMap: Record<AuditLog["action"], string> = {
  INSERT: "bg-success/10 text-success",
  UPDATE: "bg-amber-100 text-amber-700",
  DELETE: "bg-danger/10 text-danger"
};

const AuditLogPage = () => {
  const { t } = useTranslation();
  const role = useAuthStore((s: { role: "manager" | "receptionist" | "cleaner" | null }) => s.role);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (role === "manager") {
      api.get("/admin/logs").then((res: { data: AuditLog[] }) => setLogs(res.data));
    }
  }, [role]);

  if (role !== "manager") {
    return <div className="rounded-2xl bg-white p-6 shadow">{t("manager_only")}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-primary">{t("audit_logs")}</h2>
      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{t("timestamp")}</th>
              <th className="px-4 py-3">{t("user_name")}</th>
              <th className="px-4 py-3">{t("action")}</th>
              <th className="px-4 py-3">{t("details")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={`${log.event_time}-${log.username}`} className="border-b border-slate-100">
                <td className="px-4 py-3">{new Date(log.event_time).toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold">{log.username}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeMap[log.action]}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogPage;

