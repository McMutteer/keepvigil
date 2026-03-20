import { Routes, Route } from "react-router-dom";
import { useSession } from "./hooks/useSession";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Overview } from "./pages/Overview";
import { Costs } from "./pages/Costs";
import { Installations } from "./pages/Installations";
import { Executions } from "./pages/Executions";
import { Errors } from "./pages/Errors";
import { Subscriptions } from "./pages/Subscriptions";

export function App() {
  const { session, loading, logout } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<Layout session={session} onLogout={logout} />}>
        <Route index element={<Overview />} />
        <Route path="costs" element={<Costs />} />
        <Route path="installations" element={<Installations />} />
        <Route path="executions" element={<Executions />} />
        <Route path="errors" element={<Errors />} />
        <Route path="subscriptions" element={<Subscriptions />} />
      </Route>
    </Routes>
  );
}
