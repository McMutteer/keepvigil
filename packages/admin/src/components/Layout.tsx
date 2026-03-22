import { Link, Outlet, useLocation } from "react-router-dom";
import type { Session } from "../hooks/useSession";

interface LayoutProps {
  session: Session;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { to: "/", label: "Overview" },
  { to: "/costs", label: "Costs" },
  { to: "/installations", label: "Installations" },
  { to: "/executions", label: "Executions" },
  { to: "/errors", label: "Errors" },
  { to: "/subscriptions", label: "Subscriptions" },
];

export function Layout({ session, onLogout }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-bg-deep">
      <nav className="border-b border-white/[0.06] bg-bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <img src="/brand/icon-cropped.svg" alt="Vigil" className="w-[34px] h-[34px]" />
              </div>
              <span className="font-semibold text-2xl text-text-primary tracking-wider">vigil</span>
              <span className="text-sm text-accent">Admin</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.to ||
                  (item.to !== "/" && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                      isActive
                        ? "text-text-primary bg-white/[0.06]"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img
              src={session.avatarUrl}
              alt={session.login}
              className="w-7 h-7 rounded-full"
            />
            <button
              onClick={onLogout}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
