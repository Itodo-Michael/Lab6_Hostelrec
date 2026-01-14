import { useTranslation } from "react-i18next";

type BookingBar = {
  room: string;
  start: number;
  end: number;
  color: string;
};

const GanttTimeline = ({ data }: { data: BookingBar[] }) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl bg-white p-6 shadow-md">
      <h3 className="text-lg font-semibold text-primary">{t("gantt_schedule")}</h3>
      <div className="mt-4 space-y-4">
        {data.map((bar) => (
          <div key={bar.room}>
            <p className="text-sm font-semibold text-slate-500">{bar.room}</p>
            <div className="relative h-8 rounded-full bg-slate-100">
              <span
                className="absolute h-8 rounded-full text-xs font-bold text-white"
                style={{
                  left: `${bar.start}%`,
                  width: `${bar.end - bar.start}%`,
                  backgroundColor: bar.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {t("stay")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GanttTimeline;

