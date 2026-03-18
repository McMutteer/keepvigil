import { Routes, Route } from "react-router-dom";
import { useSession } from "./hooks/useSession";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { DashboardHome } from "./pages/DashboardHome";
import { ExecutionList } from "./pages/ExecutionList";
import { ExecutionDetail } from "./pages/ExecutionDetail";

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
        <Route index element={<DashboardHome session={session} />} />
        <Route path="history" element={<ExecutionList session={session} />} />
        <Route path="pr/:id" element={<ExecutionDetail />} />
      </Route>
    </Routes>
  );
}
