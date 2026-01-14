// @ts-nocheck
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useTranslation } from "react-i18next";

const colors = ["#F59E0B", "#6366F1", "#10B981", "#0EA5E9"];

type Props = {
  data: { room_type: string; revenue: number }[];
};

const RevenueChart = ({ data }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl bg-white p-6 shadow-md">
      <h3 className="text-lg font-semibold text-primary">{t("revenue_by_room_type")}</h3>
      <div className="h-64">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="revenue" nameKey="room_type" outerRadius={90} label>
              {data.map((_, idx) => (
                <Cell key={idx} fill={colors[idx % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;

