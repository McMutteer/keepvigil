import { useState, useEffect } from "react";
import { api } from "../api/client";
import { MetricCard } from "../components/MetricCard";

interface CostsData {
  period: { from: string; to: string };
  daily: Array<{ date: string; total: number; calls: number }>;
  byRepo: Array<{ owner: string; repo: string; total: number; calls: number; avgPerPR: number; prs: number }>;
  byModel: Array<{ provider: string; model: string; total: number; calls: number; promptTokens: number; completionTokens: number }>;
  bySignal: Array<{ signalId: string; total: number; calls: number; avgTokens: number }>;
  byInstallation: Array<{ installationId: string; accountLogin: string; total: number; calls: number; prs: number }>;
  totals: { promptTokens: number; completionTokens: number; totalTokens: number; totalCost: number };
  avgCostPerPR: number;
  totalPRs: number;
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

const SIGNAL_LABELS: Record<string, string> = {
  "claims-verifier": "Claims Verifier",
  "undocumented-changes": "Undocumented Changes",
  "credential-scan": "Credential Scan",
  "coverage-mapper": "Coverage Mapper",
  "contract-checker": "Contract Checker",
  "diff-analyzer": "Diff Analyzer",
  "description-generator": "Description Generator",
};

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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard label="Total Cost" value={formatCost(data.totals.totalCost)} />
        <MetricCard label="Avg Cost / PR" value={formatCost(data.avgCostPerPR)} />
        <MetricCard label="PRs Analyzed" value={data.totalPRs} />
        <MetricCard label="Prompt Tokens" value={formatTokens(data.totals.promptTokens)} />
        <MetricCard label="Completion Tokens" value={formatTokens(data.totals.completionTokens)} />
      </div>

      {/* By Signal */}
      <h2 className="text-lg font-medium mb-4">Cost by Signal</h2>
      <div className="bg-bg-surface border border-white/[0.06] rounded-lg overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-text-muted font-medium">Signal</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">Cost</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">Calls</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">Avg Tokens</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {data.bySignal.map((s) => (
              <tr key={s.signalId} className="border-b border-white/[0.04]">
                <td className="px-4 py-3">{SIGNAL_LABELS[s.signalId] ?? s.signalId}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCost(s.total)}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{s.calls}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{formatTokens(s.avgTokens)}</td>
                <td className="px-4 py-3 text-right text-text-secondary">
                  {data.totals.totalCost > 0 ? `${((s.total / data.totals.totalCost) * 100).toFixed(1)}%` : "-"}
                </td>
              </tr>
            ))}
            {data.bySignal.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-text-muted">No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Daily Costs */}
      <h2 className="text-lg font-medium mb-4">Daily Breakdown</h2>
      <div className="bg-bg-surface border border-white/[0.06] rounded-lg overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-text-muted font-medium">Date</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">Cost</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">LLM Calls</th>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* By Repo */}
        <div>
          <h2 className="text-lg font-medium mb-4">Cost by Repository</h2>
          <div className="bg-bg-surface border border-white/[0.06] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Repo</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Cost</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">PRs</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Avg/PR</th>
                </tr>
              </thead>
              <tbody>
                {data.byRepo.map((r) => (
                  <tr key={`${r.owner}/${r.repo}`} className="border-b border-white/[0.04]">
                    <td className="px-4 py-3 font-mono text-xs">{r.owner}/{r.repo}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCost(r.total)}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{r.prs}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">{formatCost(r.avgPerPR)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* By Installation */}
        <div>
          <h2 className="text-lg font-medium mb-4">Cost by Installation</h2>
          <div className="bg-bg-surface border border-white/[0.06] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Account</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Cost</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">PRs</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Calls</th>
                </tr>
              </thead>
              <tbody>
                {data.byInstallation.map((i) => (
                  <tr key={i.installationId} className="border-b border-white/[0.04]">
                    <td className="px-4 py-3">{i.accountLogin}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCost(i.total)}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{i.prs}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{i.calls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* By Model */}
      <h2 className="text-lg font-medium mb-4">Cost by Model</h2>
      <div className="bg-bg-surface border border-white/[0.06] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-text-muted font-medium">Provider / Model</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">Cost</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">Calls</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">Prompt</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">Completion</th>
            </tr>
          </thead>
          <tbody>
            {data.byModel.map((m) => (
              <tr key={`${m.provider}/${m.model}`} className="border-b border-white/[0.04]">
                <td className="px-4 py-3 font-mono text-xs">{m.provider}/{m.model}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCost(m.total)}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{m.calls}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{formatTokens(m.promptTokens)}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{formatTokens(m.completionTokens)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
