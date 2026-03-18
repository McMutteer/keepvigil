import { useEffect, useState } from "react";
import { api } from "../api/client";

export interface Stats {
  totalPRs: number;
  avgScore: number;
  completedCount: number;
  failedCount: number;
  topFailingRepos: { repo: string; failCount: number }[];
}

export interface Repo {
  owner: string;
  repo: string;
  prCount: number;
  avgScore: number;
  latestAt: string;
}

export function useStats(installationId: number | null) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!installationId) return;
    setLoading(true);
    api<Stats>(`/dashboard/stats?installation_id=${installationId}`)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [installationId]);

  return { stats, loading };
}

export function useRepos(installationId: number | null) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!installationId) return;
    setLoading(true);
    api<{ repos: Repo[] }>(`/dashboard/repos?installation_id=${installationId}`)
      .then((r) => setRepos(r.repos))
      .finally(() => setLoading(false));
  }, [installationId]);

  return { repos, loading };
}
