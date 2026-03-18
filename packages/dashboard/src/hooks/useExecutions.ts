import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";

export interface Execution {
  id: string;
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  status: string;
  score: number | null;
  pipelineMode: string | null;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

interface ExecutionDetail extends Execution {
  jobId: string;
  resultsSummary: unknown;
}

interface PaginatedResponse {
  executions: Execution[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useExecutions(installationId: number | null, page = 1) {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!installationId) return;
    setLoading(true);
    try {
      const result = await api<PaginatedResponse>(
        `/dashboard/executions?installation_id=${installationId}&page=${page}&limit=20`,
      );
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [installationId, page]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
}

export function useExecutionDetail(id: string | undefined) {
  const [data, setData] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api<ExecutionDetail>(`/dashboard/executions/${id}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading };
}
