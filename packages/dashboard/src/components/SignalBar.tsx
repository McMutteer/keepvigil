interface Signal {
  id: string;
  name: string;
  score: number;
  weight: number;
  passed: boolean;
  detailCount: number;
}

export function SignalBar({ signal }: { signal: Signal }) {
  const barColor = signal.passed ? "bg-success" : "bg-failure";

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-text-secondary w-40 shrink-0 truncate" title={signal.name}>
        {signal.name}
      </span>
      <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${signal.score}%` }}
        />
      </div>
      <span className="text-xs text-text-muted w-8 text-right font-mono">{signal.score}</span>
      <span className="text-xs text-text-muted w-6 text-right">w{signal.weight}</span>
    </div>
  );
}
