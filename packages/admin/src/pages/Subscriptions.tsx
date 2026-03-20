import { useState, useEffect } from "react";
import { api } from "../api/client";
import { MetricCard } from "../components/MetricCard";

interface Subscription {
  id: string;
  installationId: string;
  accountLogin: string;
  plan: string;
  status: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}

interface SubscriptionsData {
  subscriptions: Subscription[];
  mrr: number;
  total: number;
  activePro: number;
  activeTeam: number;
}

export function Subscriptions() {
  const [data, setData] = useState<SubscriptionsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<SubscriptionsData>("/admin/subscriptions")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="text-failure">Error: {error}</div>;
  if (!data) return <div className="text-text-muted">Loading...</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Subscriptions</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <MetricCard label="MRR" value={`$${data.mrr}`} status={data.mrr > 0 ? "success" : "default"} />
        <MetricCard label="Active Pro" value={data.activePro} />
        <MetricCard label="Active Team" value={data.activeTeam} />
      </div>

      <div className="bg-bg-surface border border-white/[0.06] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-text-muted font-medium">Account</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Plan</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Status</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Period End</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Since</th>
            </tr>
          </thead>
          <tbody>
            {data.subscriptions.map((sub) => (
              <tr key={sub.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium">{sub.accountLogin}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    sub.plan === "team" ? "bg-accent/10 text-accent" :
                    sub.plan === "pro" ? "bg-info/10 text-info" :
                    "bg-white/[0.06] text-text-muted"
                  }`}>
                    {sub.plan}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={sub.status === "active" ? "text-success" : "text-text-muted"}>
                    {sub.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary text-xs">
                  {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "-"}
                </td>
                <td className="px-4 py-3 text-text-secondary text-xs">
                  {new Date(sub.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {data.subscriptions.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-text-muted">No subscriptions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
