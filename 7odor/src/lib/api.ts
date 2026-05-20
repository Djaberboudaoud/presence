/**
 * Hudur API client
 * All requests go to the FastAPI backend
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken(): string | null {
  try {
    const raw = localStorage.getItem("hadir-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err?.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: number;
  username: string;
  role: "admin" | "school";
  NCENTRE: string;
  NOMCENTRE: string;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: ApiUser;
}

export const authApi = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<ApiUser>("/api/auth/me"),
};

// ─── Users ───────────────────────────────────────────────────────────────────

export interface CreateUserPayload {
  username: string;
  password: string;
  role: "admin" | "school";
  NCENTRE: string;
  NOMCENTRE: string;
}

export interface UpdateUserPayload {
  username?: string;
  password?: string;
  NOMCENTRE?: string;
}

export const usersApi = {
  list: () => request<ApiUser[]>("/api/users"),

  create: (payload: CreateUserPayload) =>
    request<{ id: number; message: string }>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: number, payload: UpdateUserPayload) =>
    request<{ message: string }>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: number) =>
    request<{ message: string }>(`/api/users/${id}`, { method: "DELETE" }),
};

// ─── Students ────────────────────────────────────────────────────────────────

export interface ApiStudent {
  ID: string;
  IANNEXE: string | null;
  IANNEEINS: string | null;
  INSEQ: string | null;
  ORDREC: string | null;
  ICODE: string | null;
  NIVEAU: string | null;
  FILIERE: string | null;
  MATIERE: string | null;
  NOM: string;
  PRENOM: string;
  WILAYA: string | null;
  NSALLE: string | null;
  NCENTRE: string;
  status: string;
  created_at: string | null;
}

export const studentsApi = {
  list: (params?: {
    ncentre?: string;
    niveau?: string;
    filiere?: string;
    matiere?: string;
    search?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.ncentre) qs.set("ncentre", params.ncentre);
    if (params?.niveau) qs.set("niveau", params.niveau);
    if (params?.filiere) qs.set("filiere", params.filiere);
    if (params?.matiere) qs.set("matiere", params.matiere);
    if (params?.search) qs.set("search", params.search);
    const q = qs.toString();
    return request<ApiStudent[]>(`/api/students${q ? "?" + q : ""}`);
  },

  create: (student: Omit<ApiStudent, "created_at">) =>
    request<{ message: string }>("/api/students", {
      method: "POST",
      body: JSON.stringify(student),
    }),

  bulkImport: (students: Omit<ApiStudent, "created_at">[]) =>
    request<{ inserted: number; skipped: number }>("/api/students/bulk", {
      method: "POST",
      body: JSON.stringify({ students }),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/students/${id}`, { method: "DELETE" }),

  updateStatus: (
    id: string,
    payload: { status: string; niveau?: string; filiere?: string; matiere?: string }
  ) =>
    request<{ message: string }>(`/api/students/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  resetStatus: () =>
    request<{ message: string }>("/api/students/reset-status", {
      method: "POST",
    }),
};

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface AdminStats {
  total_schools: number;
  total_students: number;
  completion_rate: number;
  by_school: { NCENTRE: string; NOMCENTRE: string; student_count: number, total_rows: number, marked_rows: number, present_count: number, absent_count: number }[];
  by_level: { NIVEAU: string; FILIERE: string; cnt: number, present_count: number, absent_count: number }[];
}

export interface SchoolStats {
  total_students: number;
  by_level: { NIVEAU: string; cnt: number }[];
  by_filiere: { FILIERE: string; cnt: number }[];
  by_salle: { NSALLE: string; cnt: number }[];
}

export const statsApi = {
  get: () => request<AdminStats | SchoolStats>("/api/stats"),
};

// ─── Levels / Filieres ───────────────────────────────────────────────────────

export const levelsApi = {
  list: (filiere?: string, matiere?: string) => {
    const qs = new URLSearchParams();
    if (filiere) qs.set("filiere", filiere);
    if (matiere) qs.set("matiere", matiere);
    const q = qs.toString();
    return request<string[]>(`/api/levels${q ? "?" + q : ""}`);
  },
  filieres: (niveau?: string, matiere?: string) => {
    const qs = new URLSearchParams();
    if (niveau) qs.set("niveau", niveau);
    if (matiere) qs.set("matiere", matiere);
    const q = qs.toString();
    return request<string[]>(`/api/filieres${q ? "?" + q : ""}`);
  },
  matieres: (niveau?: string, filiere?: string) => {
    const qs = new URLSearchParams();
    if (niveau) qs.set("niveau", niveau);
    if (filiere) qs.set("filiere", filiere);
    const q = qs.toString();
    return request<string[]>(`/api/matieres${q ? "?" + q : ""}`);
  },
};
