import { useState, useEffect } from "react";
import { api } from "../api/client";

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
  lastPRAt: string | null;
}

export function Installations() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ installations: Installation[] }>("/admin/installations")
      .then((d) => setInstallations(d.installations))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="text-failure">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Installations ({installations.length})</h1>
      <div className="bg-bg-surface border border-white/[0.06] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-text-muted font-medium">Account</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Plan</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">PRs</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Last PR</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Installed</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {installations.map((inst) => (
              <tr key={inst.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium">{inst.accountLogin}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    inst.plan === "team" ? "bg-accent/10 text-accent" :
                    inst.plan === "pro" ? "bg-info/10 text-info" :
                    "bg-white/[0.06] text-text-muted"
                  }`}>
                    {inst.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">{inst.totalPRs}</td>
                <td className="px-4 py-3 text-text-secondary text-xs">
                  {inst.lastPRAt ? new Date(inst.lastPRAt).toLocaleDateString() : "-"}
                </td>
                <td className="px-4 py-3 text-text-secondary text-xs">
                  {new Date(inst.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span className={inst.active ? "text-success" : "text-failure"}>
                    {inst.active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
