import { useState } from "react";
import { Link } from "react-router-dom";
import type { Session } from "../hooks/useSession";
import { useStats, useRepos } from "../hooks/useStats";
import { useExecutions } from "../hooks/useExecutions";
import { ScoreBadge } from "../components/ScoreBadge";

function StatCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="bg-bg-surface border border-white/[0.06] rounded-xl p-5">
      <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-medium text-text-primary">{value}</p>
      {subtext && <p className="text-xs text-text-muted mt-1">{subtext}</p>}
    </div>
  );
}

export function DashboardHome({ session }: { session: Session }) {
  const [selectedInstallation] = useState<number>(session.installationIds[0] ?? 0);
  const { stats, loading: statsLoading } = useStats(selectedInstallation);
  const { repos } = useRepos(selectedInstallation);
  const { data: execData } = useExecutions(selectedInstallation);

  if (!selectedInstallation) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">No Vigil installations found.</p>
        <a
          href="https://github.com/apps/keepvigil"
          className="text-accent hover:text-accent-hover text-sm mt-2 inline-block"
        >
          Install Vigil on GitHub
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium text-text-primary">Overview</h1>
        <p className="text-sm text-text-secondary mt-1">
          PR verification metrics for your repos.
        </p>
      </div>

      {/* Stats cards */}
      {statsLoading ? (
        <div className="text-text-muted">Loading stats...</div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total PRs" value={stats.totalPRs} />
          <StatCard label="Avg Score" value={stats.avgScore ?? "--"} />
          <StatCard label="Completed" value={stats.completedCount} />
          <StatCard label="Failed" value={stats.failedCount} />
        </div>
      ) : null}

      {/* Repos */}
      {repos.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-text-primary mb-3">Repos</h2>
          <div className="bg-bg-surface border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Repo</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">PRs</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {repos.map((r) => (
                  <tr key={`${r.owner}/${r.repo}`} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3 text-text-primary font-mono text-xs">
                      {r.owner}/{r.repo}
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary">{r.prCount}</td>
                    <td className="px-4 py-3 text-right">
                      <ScoreBadge score={r.avgScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent PRs */}
      {execData && execData.executions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-text-primary">Recent PRs</h2>
            <Link to="/history" className="text-xs text-accent hover:text-accent-hover">
              View all
            </Link>
          </div>
          <div className="bg-bg-surface border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">PR</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Repo</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Score</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {execData.executions.slice(0, 10).map((e) => (
                  <tr key={e.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        to={`/pr/${e.id}`}
                        className="text-accent hover:text-accent-hover font-mono text-xs"
                      >
                        #{e.pullNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                      {e.owner}/{e.repo}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ScoreBadge score={e.score} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-xs ${e.status === "completed" ? "text-success" : e.status === "failed" ? "text-failure" : "text-text-muted"}`}
                      >
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
