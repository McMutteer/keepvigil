import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";

export interface Session {
  userId: number;
  login: string;
  avatarUrl: string;
  installationIds: number[];
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Session>("/auth/session")
      .then(setSession)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setSession(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await api("/auth/logout", { method: "POST" });
    setSession(null);
  };

  return { session, loading, logout };
}
