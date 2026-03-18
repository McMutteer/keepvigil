import { useState } from "react";
import { Link } from "react-router-dom";
import type { Session } from "../hooks/useSession";
import { useExecutions } from "../hooks/useExecutions";
import { ScoreBadge } from "../components/ScoreBadge";

export function ExecutionList({ session }: { session: Session }) {
  const installationId = session.installationIds[0] ?? 0;
  const [page, setPage] = useState(1);
  const { data, loading } = useExecutions(installationId, page);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium text-text-primary">Verification History</h1>

      {loading && <div className="text-text-muted">Loading...</div>}

      {data && (
        <>
          <div className="bg-bg-surface border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">PR</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Repo</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Mode</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Score</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.executions.map((e) => (
                  <tr key={e.id} className="border-b border-white/[0.04] last:border-0 hover:bg-bg-elevated/30 transition-colors">
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
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {e.pipelineMode ?? "--"}
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
                    <td className="px-4 py-3 text-right text-text-muted text-xs">
                      {new Date(e.startedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-md bg-bg-surface border border-white/[0.06] text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-text-muted">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className="px-3 py-1.5 text-xs rounded-md bg-bg-surface border border-white/[0.06] text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
