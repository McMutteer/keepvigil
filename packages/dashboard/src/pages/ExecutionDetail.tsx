import { useParams, Link } from "react-router-dom";
import { useExecutionDetail } from "../hooks/useExecutions";
import { ScoreBadge } from "../components/ScoreBadge";
import { SignalBar } from "../components/SignalBar";

export function ExecutionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useExecutionDetail(id);

  if (loading) {
    return <div className="text-text-muted py-8">Loading...</div>;
  }

  if (!data) {
    return <div className="text-text-muted py-8">Execution not found.</div>;
  }

  const summary = data.resultsSummary as {
    score?: number;
    recommendation?: string;
    signals?: { id: string; name: string; score: number; weight: number; passed: boolean; detailCount: number }[];
    summary?: { total: number; passed: number; failed: number; skipped: number };
    pipelineMode?: string;
    tier?: string;
  } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Link to="/history" className="hover:text-text-primary transition-colors">
          History
        </Link>
        <span>/</span>
        <span className="text-text-secondary">PR #{data.pullNumber}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">
            {data.owner}/{data.repo} #{data.pullNumber}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {data.headSha.slice(0, 8)} &middot; {data.pipelineMode ?? "unknown"} &middot;{" "}
            <span className={data.status === "completed" ? "text-success" : data.status === "failed" ? "text-failure" : ""}>
              {data.status}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted uppercase tracking-wider">Score</p>
          <p className="text-3xl mt-1">
            <ScoreBadge score={data.score} />
          </p>
        </div>
      </div>

      {data.error && (
        <div className="bg-failure/10 border border-failure/20 rounded-lg p-4">
          <p className="text-sm text-failure">{data.error}</p>
        </div>
      )}

      {/* Signals */}
      {summary?.signals && summary.signals.length > 0 && (
        <div className="bg-bg-surface border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-4">
            Signals
          </h2>
          <div className="space-y-1">
            {summary.signals.map((s) => (
              <SignalBar key={s.id} signal={s} />
            ))}
          </div>
        </div>
      )}

      {/* Summary counts */}
      {summary?.summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-bg-surface border border-white/[0.06] rounded-xl p-4 text-center">
            <p className="text-xs text-text-muted">Total</p>
            <p className="text-lg font-medium text-text-primary">{summary.summary.total}</p>
          </div>
          <div className="bg-bg-surface border border-white/[0.06] rounded-xl p-4 text-center">
            <p className="text-xs text-text-muted">Passed</p>
            <p className="text-lg font-medium text-success">{summary.summary.passed}</p>
          </div>
          <div className="bg-bg-surface border border-white/[0.06] rounded-xl p-4 text-center">
            <p className="text-xs text-text-muted">Failed</p>
            <p className="text-lg font-medium text-failure">{summary.summary.failed}</p>
          </div>
          <div className="bg-bg-surface border border-white/[0.06] rounded-xl p-4 text-center">
            <p className="text-xs text-text-muted">Skipped</p>
            <p className="text-lg font-medium text-text-muted">{summary.summary.skipped}</p>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-bg-surface border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
          Details
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-text-muted">Job ID</dt>
          <dd className="text-text-secondary font-mono text-xs">{data.jobId}</dd>
          <dt className="text-text-muted">Started</dt>
          <dd className="text-text-secondary">{new Date(data.startedAt).toLocaleString()}</dd>
          <dt className="text-text-muted">Completed</dt>
          <dd className="text-text-secondary">
            {data.completedAt ? new Date(data.completedAt).toLocaleString() : "--"}
          </dd>
          {summary?.tier && (
            <>
              <dt className="text-text-muted">Tier</dt>
              <dd className="text-text-secondary capitalize">{summary.tier}</dd>
            </>
          )}
          {summary?.recommendation && (
            <>
              <dt className="text-text-muted">Recommendation</dt>
              <dd className="text-text-secondary capitalize">{summary.recommendation}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
}
