import { useState, useEffect } from "react";
import { api } from "../api/client";

interface CostsData {
  period: { from: string; to: string };
  daily: Array<{ date: string; total: number; calls: number }>;
  byRepo: Array<{ owner: string; repo: string; total: number; calls: number }>;
  byModel: Array<{ provider: string; model: string; total: number; calls: number }>;
  totals: { promptTokens: number; completionTokens: number; totalTokens: number; totalCost: number };
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function Costs() {
  const [data, setData] = useState<CostsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<CostsData>("/admin/costs")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="text-failure">Error: {error}</div>;
  if (!data) return <div className="text-text-muted">Loading...</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">LLM Costs</h1>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-bg-surface border border-white/[0.06] rounded-lg p-5">
          <div className="text-sm text-text-muted mb-1">Total Cost</div>
          <div className="text-2xl font-semibold text-accent">{formatCost(data.totals.totalCost)}</div>
        </div>
        <div className="bg-bg-surface border border-white/[0.06] rounded-lg p-5">
          <div className="text-sm text-text-muted mb-1">Prompt Tokens</div>
          <div className="text-2xl font-semibold">{formatTokens(data.totals.promptTokens)}</div>
        </div>
        <div className="bg-bg-surface border border-white/[0.06] rounded-lg p-5">
          <div className="text-sm text-text-muted mb-1">Completion Tokens</div>
          <div className="text-2xl font-semibold">{formatTokens(data.totals.completionTokens)}</div>
        </div>
        <div className="bg-bg-surface border border-white/[0.06] rounded-lg p-5">
          <div className="text-sm text-text-muted mb-1">Total Tokens</div>
          <div className="text-2xl font-semibold">{formatTokens(data.totals.totalTokens)}</div>
        </div>
      </div>

      {/* Daily Costs */}
      <h2 className="text-lg font-medium mb-4">Daily Breakdown</h2>
      <div className="bg-bg-surface border border-white/[0.06] rounded-lg overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-text-muted font-medium">Date</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">Cost</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">Calls</th>
            </tr>
          </thead>
          <tbody>
            {data.daily.map((d) => (
              <tr key={d.date} className="border-b border-white/[0.04]">
                <td className="px-4 py-3">{d.date}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCost(d.total)}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{d.calls}</td>
              </tr>
            ))}
            {data.daily.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-text-muted">No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Repo */}
        <div>
          <h2 className="text-lg font-medium mb-4">By Repository</h2>
          <div className="bg-bg-surface border border-white/[0.06] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Repo</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Cost</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Calls</th>
                </tr>
              </thead>
              <tbody>
                {data.byRepo.map((r) => (
                  <tr key={`${r.owner}/${r.repo}`} className="border-b border-white/[0.04]">
                    <td className="px-4 py-3 font-mono text-xs">{r.owner}/{r.repo}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCost(r.total)}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{r.calls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* By Model */}
        <div>
          <h2 className="text-lg font-medium mb-4">By Model</h2>
          <div className="bg-bg-surface border border-white/[0.06] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Provider / Model</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Cost</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Calls</th>
                </tr>
              </thead>
              <tbody>
                {data.byModel.map((m) => (
                  <tr key={`${m.provider}/${m.model}`} className="border-b border-white/[0.04]">
                    <td className="px-4 py-3 font-mono text-xs">{m.provider}/{m.model}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCost(m.total)}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{m.calls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
