interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  status?: "default" | "success" | "danger";
}

export function MetricCard({ label, value, subtitle, status = "default" }: MetricCardProps) {
  const valueColor = {
    default: "text-text-primary",
    success: "text-success",
    danger: "text-failure",
  }[status];

  return (
    <div className="bg-bg-surface border border-white/[0.06] rounded-lg p-5">
      <div className="text-sm text-text-muted mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${valueColor}`}>{value}</div>
      {subtitle && (
        <div className="text-xs text-text-muted mt-1">{subtitle}</div>
      )}
    </div>
  );
}
