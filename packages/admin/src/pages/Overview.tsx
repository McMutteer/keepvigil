import { useState, useEffect } from "react";
import { api } from "../api/client";
import { MetricCard } from "../components/MetricCard";

interface OverviewData {
  llmSpend: { today: number; week: number; month: number };
  prsProcessed: { today: number; total: number };
  installations: { active: number; newThisWeek: number };
  errors: { last24h: number };
  recentExecutions: Array<{
    id: string;
    owner: string;
    repo: string;
    pullNumber: number;
    score: number | null;
    status: string;
    startedAt: string;
    error: string | null;
  }>;
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function Overview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<OverviewData>("/admin/overview")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <div className="text-failure">Error: {error}</div>;
  }

  if (!data) {
    return <div className="text-text-muted">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="LLM Spend"
          value={formatCost(data.llmSpend.month)}
          subtitle={`Today: ${formatCost(data.llmSpend.today)} / Week: ${formatCost(data.llmSpend.week)}`}
        />
        <MetricCard
          label="PRs Processed"
          value={data.prsProcessed.total}
          subtitle={`Today: ${data.prsProcessed.today}`}
        />
        <MetricCard
          label="Installations"
          value={data.installations.active}
          subtitle={`${data.installations.newThisWeek} new this week`}
        />
        <MetricCard
          label="Errors (24h)"
          value={data.errors.last24h}
          status={data.errors.last24h === 0 ? "success" : "danger"}
        />
      </div>

      <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
      <div className="bg-bg-surface border border-white/[0.06] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-text-muted font-medium">Repo</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">PR</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Score</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Status</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {data.recentExecutions.map((exec) => (
              <tr key={exec.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-xs">
                  {exec.owner}/{exec.repo}
                </td>
                <td className="px-4 py-3">#{exec.pullNumber}</td>
                <td className="px-4 py-3">
                  {exec.score != null ? (
                    <span className={exec.score >= 70 ? "text-success" : "text-failure"}>
                      {exec.score}
                    </span>
                  ) : (
                    <span className="text-text-muted">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    exec.status === "completed" ? "bg-success/10 text-success" :
                    exec.status === "failed" ? "bg-failure/10 text-failure" :
                    "bg-warning/10 text-warning"
                  }`}>
                    {exec.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-text-muted">
                  {timeAgo(exec.startedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
