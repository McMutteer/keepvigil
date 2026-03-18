export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-text-muted">--</span>;

  const color =
    score >= 80
      ? "text-success"
      : score >= 50
        ? "text-warning"
        : "text-failure";

  return (
    <span className={`font-mono font-medium ${color}`}>
      {score}
    </span>
  );
}
