"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { MOCK_USERS, type Role, type User } from "@/lib/mock-data";
import { api } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, opts?: { next?: string }) => Promise<void>;
  registerAccount: (data: {
    fullName: string;
    email: string;
    password: string;
    role?: Role;
    address?: string;
    phone?: string;
    blockNo?: string;
    lotNo?: string;
  }) => Promise<void>;
  loginWithGoogle: (credential: string, opts?: { next?: string }) => Promise<void>;
  logout: () => void;
  setRolePreview: (role: Role) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// LocalStorage can hold stale/malformed entries from older app versions, which
// crash consumers that assume the user shape. Only surface well-formed users.
function isWellFormedUser(u: unknown): u is User {
  if (!u || typeof u !== "object") return false;
  const c = u as Record<string, unknown>;
  return (
    typeof c.email === "string" &&
    typeof c.role === "string" &&
    typeof c.fullName === "string"
  );
}

function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem("mh_user");
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as User | null;
    if (!isWellFormedUser(parsed)) {
      localStorage.removeItem("mh_user");
      return null;
    }
    if (parsed.fullName === "Super Admin") parsed.fullName = "admin";
    return parsed;
  } catch {
    localStorage.removeItem("mh_user");
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [loading, setLoading] = useState(true);

  const persist = (u: User | null) => {
    setUser(u);
    if (u && isWellFormedUser(u)) localStorage.setItem("mh_user", JSON.stringify(u));
    else localStorage.removeItem("mh_user");
  };

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data && data.user) {
          persist(data.user as User);
        } else if (readStoredUser()) {
          // If server says unauthenticated (no session cookie or invalid session),
          // sync client state to unauthenticated as well.
          persist(null);
        }
      })
      .catch(() => {
        /* keep cached user on network error */
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const roleHome = (role: Role) =>
    role === "admin" ? "/admin" :
    role === "counselor" ? "/admin/residents" :
    "/";

  const login = async (email: string, password: string, opts?: { next?: string }) => {
    let user: User;
    try {
      const { user: u } = await api.login(email, password);
      user = u;
    } catch (err) {
      throw err instanceof Error ? err : new Error("Login failed. Please try again.");
    }

    persist(user);
    const target = user.role === "admin" ? "/admin" : (opts?.next && !opts.next.startsWith("/login") ? opts.next : roleHome(user.role));
    window.location.href = target;
  };

  const registerAccount = async (data: {
    fullName: string;
    email: string;
    password: string;
    role?: Role;
    address?: string;
    phone?: string;
    blockNo?: string;
    lotNo?: string;
  }) => {
    try {
      await api.register({
        ...data,
        // Self-registered accounts start as non_resident pending admin verification.
        // Only the admin can upgrade to resident via the admin panel.
        role: data.role || "non_resident",
        email: data.email.trim().toLowerCase(),
      });
    } catch (err) {
      throw err instanceof Error ? err : new Error("Registration failed. Please try again.");
    }
  };

  const loginWithGoogle = async (credential: string, opts?: { next?: string }) => {
    let user: User;
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.user) {
        throw new Error((json as { error?: string } | null)?.error || "Google sign-in failed. Please try again.");
      }
      user = json.user as User;
    } catch (err) {
      throw err instanceof Error ? err : new Error("Google sign-in failed. Please try again.");
    }

    persist(user);
    const target = user.role === "admin" ? "/admin" : (opts?.next && !opts.next.startsWith("/login") ? opts.next : roleHome(user.role));
    window.location.href = target;
  };

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    persist(null);
  };

  const setRolePreview = (role: Role) => {
    const base = MOCK_USERS.find((u) => u.role === role) ?? MOCK_USERS[0];
    persist(base);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, registerAccount, loginWithGoogle, logout, setRolePreview }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
