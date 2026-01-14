type Props = {
  label: string;
  value: string;
  accent?: string;
};

const KpiCard = ({ label, value, accent = "text-primary" }: Props) => (
  <div className="rounded-2xl bg-white p-6 shadow-md">
    <p className="text-sm font-semibold text-slate-500">{label}</p>
    <p className={`mt-3 text-3xl font-bold ${accent}`}>{value}</p>
  </div>
);

export default KpiCard;

