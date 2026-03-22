import { Link, Outlet } from "react-router-dom";
import type { Session } from "../hooks/useSession";

interface LayoutProps {
  session: Session;
  onLogout: () => void;
}

export function Layout({ session, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-bg-deep">
      <nav className="border-b border-white/[0.06] bg-bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <img src="/brand/icon-cropped.svg" alt="Vigil" className="w-8 h-8" />
              </div>
              <span className="font-semibold text-2xl text-text-primary tracking-wider">vigil</span>
              <span className="text-sm text-text-secondary">Dashboard</span>
            </Link>
            <div className="hidden sm:flex items-center gap-4">
              <Link
                to="/"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Overview
              </Link>
              <Link
                to="/history"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                History
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img
              src={session.avatarUrl}
              alt={session.login}
              className="w-7 h-7 rounded-full"
            />
            <span className="text-sm text-text-secondary hidden sm:block">
              {session.login}
            </span>
            <button
              onClick={onLogout}
              className="text-xs text-text-muted hover:text-text-primary transition-colors ml-2"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
