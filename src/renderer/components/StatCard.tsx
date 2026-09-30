type Props = {
  label: string;
  value: React.ReactNode;
  tone?: "green" | "blue" | "yellow" | "red";
};

export function StatCard({ label, value, tone = "green" }: Props) {
  const colors = {
    green: "border-cyber/25 text-cyber",
    blue: "border-signal/25 text-signal",
    yellow: "border-warning/30 text-warning",
    red: "border-danger/30 text-danger"
  };
  return (
    <div className={`rounded-md border bg-white/[0.045] p-4 shadow-glow backdrop-blur ${colors[tone]}`}>
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <div className="mt-2 text-2xl font-semibold text-current">{value}</div>
    </div>
  );
}
