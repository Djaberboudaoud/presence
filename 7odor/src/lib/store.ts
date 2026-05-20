import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, type ApiUser } from "@/lib/api";

// ─────────────────────────────────────────────
// Auth store — backed by real FastAPI backend
// ─────────────────────────────────────────────
export type UserRole = "admin" | "school";

export interface AuthUser {
  id: number;
  name: string;        // NOMCENTRE used as display name
  username: string;
  role: UserRole;
  NCENTRE: string;
  NOMCENTRE: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

function toAuthUser(u: ApiUser): AuthUser {
  return {
    id: u.id,
    name: u.NOMCENTRE,
    username: u.username,
    role: u.role,
    NCENTRE: u.NCENTRE,
    NOMCENTRE: u.NOMCENTRE,
  };
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        const res = await authApi.login(username, password);
        const user = toAuthUser(res.user);
        set({ user, token: res.access_token, isAuthenticated: true });
        return user;
      },

      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: "hadir-auth" }
  )
);

// ─────────────────────────────────────────────
// Theme store (unchanged)
// ─────────────────────────────────────────────
type Theme = "light" | "dark";
interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      toggle: () => {
        const next = get().theme === "light" ? "dark" : "light";
        set({ theme: next });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", next === "dark");
        }
      },
      set: (t) => {
        set({ theme: t });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", t === "dark");
        }
      },
    }),
    { name: "hadir-theme" }
  )
);
