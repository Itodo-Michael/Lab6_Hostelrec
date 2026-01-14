import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import KpiCard from "../components/KpiCard";
import RevenueChart from "../components/RevenueChart";
import GanttTimeline from "../components/GanttTimeline";
import { api } from "../services/api";
import { useAuthStore, type AuthState } from "../hooks/useAuthStore";

type Occupancy = {
  occupancy_rate: number;
  available_rooms: number;
  occupied_rooms: number;
};

type Revenue = { room_type: string; revenue: number };

const AdminDashboard = () => {
  const { t } = useTranslation();
  const role = useAuthStore((state: AuthState) => state.role);
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);
  const [revenue, setRevenue] = useState<Revenue[]>([]);

  useEffect(() => {
    api.get("/stats/occupancy").then((res: { data: Occupancy }) => setOccupancy(res.data));
    if (role === "manager") {
      api.get("/stats/revenue").then((res: { data: Revenue[] }) => setRevenue(res.data));
    }
  }, [role]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">{t("admin_dashboard_title")}</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label={t("occupancy")} value={`${Math.round((occupancy?.occupancy_rate ?? 0) * 100)}%`} />
        <KpiCard label={t("rooms_available")} value={`${occupancy?.available_rooms ?? "--"}`} />
        {role === "manager" && (
          <KpiCard label={t("revenue_today")} value="₽ 180,000" accent="text-accent" />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {role === "manager" ? (
          <RevenueChart data={revenue.length ? revenue : [{ room_type: t("room_type_deluxe"), revenue: 75 }]} />
        ) : (
          <div className="rounded-2xl bg-slate-100 p-6 text-slate-500">
            {t("revenue_hidden_for_role")}
          </div>
        )}
        <GanttTimeline
          data={[
            { room: "101", start: 10, end: 55, color: "#10B981" },
            { room: "102", start: 30, end: 80, color: "#F59E0B" },
            { room: "201", start: 0, end: 40, color: "#0EA5E9" }
          ]}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;

