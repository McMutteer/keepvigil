import { useState, useEffect } from "react";
import { api } from "../api/client";

interface Execution {
  id: string;
  owner: string;
  repo: string;
  pullNumber: number;
  score: number | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

interface ExecutionsData {
  executions: Execution[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function Executions() {
  const [data, setData] = useState<ExecutionsData | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api<ExecutionsData>(`/admin/executions?page=${page}&limit=25`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [page]);

  if (error) return <div className="text-failure">Error: {error}</div>;
  if (!data) return <div className="text-text-muted">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">
          Executions ({data.pagination.total})
        </h1>
      </div>

      <div className="bg-bg-surface border border-white/[0.06] rounded-lg overflow-hidden mb-4">
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
            {data.executions.map((exec) => (
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

      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded bg-bg-elevated text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {page} of {data.pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page === data.pagination.totalPages}
            className="px-3 py-1.5 text-sm rounded bg-bg-elevated text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
