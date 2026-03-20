import { useState, useEffect } from "react";
import { api } from "../api/client";

interface ErrorEntry {
  id: string;
  owner: string;
  repo: string;
  pullNumber: number;
  error: string | null;
  jobId: string;
  startedAt: string;
}

interface ErrorsData {
  errors: ErrorEntry[];
  total: number;
}

export function Errors() {
  const [data, setData] = useState<ErrorsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ErrorsData>("/admin/errors")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="text-failure">Error: {error}</div>;
  if (!data) return <div className="text-text-muted">Loading...</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Pipeline Errors ({data.total})</h1>

      {data.errors.length === 0 ? (
        <div className="bg-bg-surface border border-white/[0.06] rounded-lg p-8 text-center">
          <div className="text-success text-lg mb-1">No errors</div>
          <div className="text-text-muted text-sm">All pipelines ran successfully in the last 7 days</div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.errors.map((err) => (
            <div key={err.id} className="bg-bg-surface border border-white/[0.06] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-text-secondary">
                  {err.owner}/{err.repo} #{err.pullNumber}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(err.startedAt).toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-failure font-mono break-all">
                {err.error ?? "Unknown error"}
              </div>
              <div className="text-xs text-text-muted mt-2">
                Correlation: {err.jobId}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
