import { useState, useEffect } from "react";
import { api } from "../api/client";
import { MetricCard } from "../components/MetricCard";

interface Repo {
  owner: string;
  repo: string;
  prCount: number;
  avgScore: number | null;
  latestAt: string | null;
}

interface Installation {
  id: string;
  githubInstallationId: string;
  accountLogin: string;
  accountType: string;
  active: boolean;
  createdAt: string;
  plan: string;
  subscriptionStatus: string;
  totalPRs: number;
  avgScore: number | null;
  completedPRs: number;
  failedPRs: number;
  lastPRAt: string | null;
  llmCost: number;
  llmCalls: number;
  repos: Repo[];
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function Installations() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ installations: Installation[] }>("/admin/installations")
      .then((d) => setInstallations(d.installations))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="text-failure">Error: {error}</div>;

  const totalLLMCost = installations.reduce((sum, i) => sum + i.llmCost, 0);
  const totalPRs = installations.reduce((sum, i) => sum + i.totalPRs, 0);
  const activeCount = installations.filter((i) => i.active).length;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Installations ({installations.length})</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Active" value={activeCount} status="success" />
        <MetricCard label="Total PRs" value={totalPRs} />
        <MetricCard label="Total LLM Cost" value={formatCost(totalLLMCost)} />
        <MetricCard label="Avg Cost/Install" value={formatCost(activeCount > 0 ? totalLLMCost / activeCount : 0)} />
      </div>

      <div className="space-y-3">
        {installations.map((inst) => (
          <div key={inst.id} className="bg-bg-surface border border-white/[0.06] rounded-lg overflow-hidden">
            {/* Installation header row */}
            <button
              onClick={() => setExpanded(expanded === inst.id ? null : inst.id)}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <span className="font-medium">{inst.accountLogin}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  inst.plan === "team" ? "bg-accent/10 text-accent" :
                  inst.plan === "pro" ? "bg-info/10 text-info" :
                  "bg-white/[0.06] text-text-muted"
                }`}>
                  {inst.plan}
                </span>
                <span className={inst.active ? "text-success text-xs" : "text-failure text-xs"}>
                  {inst.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm text-text-secondary">
                <span>{inst.totalPRs} PRs</span>
                {inst.avgScore != null && (
                  <span className={inst.avgScore >= 70 ? "text-success" : "text-warning"}>
                    Avg: {inst.avgScore}
                  </span>
                )}
                <span className="font-mono">{formatCost(inst.llmCost)}</span>
                <span className="text-text-muted">{expanded === inst.id ? "▲" : "▼"}</span>
              </div>
            </button>

            {/* Expanded detail */}
            {expanded === inst.id && (
              <div className="border-t border-white/[0.06] px-4 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <div className="text-text-muted">Completed PRs</div>
                    <div className="text-success font-medium">{inst.completedPRs}</div>
                  </div>
                  <div>
                    <div className="text-text-muted">Failed PRs</div>
                    <div className={inst.failedPRs > 0 ? "text-failure font-medium" : "text-text-secondary"}>{inst.failedPRs}</div>
                  </div>
                  <div>
                    <div className="text-text-muted">LLM Calls</div>
                    <div>{inst.llmCalls}</div>
                  </div>
                  <div>
                    <div className="text-text-muted">Installed</div>
                    <div>{new Date(inst.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                {inst.repos.length > 0 && (
                  <>
                    <div className="text-sm font-medium text-text-secondary mb-2">Repositories ({inst.repos.length})</div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left px-2 py-2 text-text-muted font-medium">Repo</th>
                          <th className="text-right px-2 py-2 text-text-muted font-medium">PRs</th>
                          <th className="text-right px-2 py-2 text-text-muted font-medium">Avg Score</th>
                          <th className="text-right px-2 py-2 text-text-muted font-medium">Last Activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inst.repos.map((r) => (
                          <tr key={`${r.owner}/${r.repo}`} className="border-b border-white/[0.04]">
                            <td className="px-2 py-2 font-mono text-xs">{r.owner}/{r.repo}</td>
                            <td className="px-2 py-2 text-right">{r.prCount}</td>
                            <td className="px-2 py-2 text-right">
                              {r.avgScore != null ? (
                                <span className={r.avgScore >= 70 ? "text-success" : "text-warning"}>{r.avgScore}</span>
                              ) : "-"}
                            </td>
                            <td className="px-2 py-2 text-right text-text-muted text-xs">
                              {r.latestAt ? new Date(r.latestAt).toLocaleDateString() : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
