export interface User { id: number; email: string }
export type HabitType = "build" | "break";
export type LogStatus = "completed" | "missed" | "clean" | "relapsed";
export type GoalStatus = "active" | "completed" | "archived";

export interface Habit {
  id: number;
  title: string;
  description: string | null;
  type: HabitType;
  currentStreak: number;
  bestStreak: number;
  todayStatus: LogStatus | null;
}

export interface Goal {
  id: number;
  habitId: number | null;
  habitTitle: string | null;
  title: string;
  targetDate: string | null;
  status: GoalStatus;
}

const TOKEN_KEY = "habit_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

/** Local calendar date as YYYY-MM-DD (not UTC), so "today" matches the user's day. */
export const today = () => new Date().toLocaleDateString("en-CA");

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && token) onUnauthorized();
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
const t = () => `today=${today()}`;

export const api = {
  register: (email: string, password: string) => request<{ token: string; user: User }>("/api/auth/register", json("POST", { email, password })),
  login: (email: string, password: string) => request<{ token: string; user: User }>("/api/auth/login", json("POST", { email, password })),
  me: () => request<{ user: User }>("/api/auth/me"),

  habits: () => request<Habit[]>(`/api/habits?${t()}`),
  addHabit: (title: string, description: string, type: HabitType) => request<Habit>(`/api/habits?${t()}`, json("POST", { title, description, type })),
  deleteHabit: (id: number) => request<void>(`/api/habits/${id}`, { method: "DELETE" }),
  logHabit: (id: number, status: LogStatus) => request<Habit>(`/api/habits/${id}/log`, json("POST", { status, date: today(), today: today() })),
  undoLog: (id: number) => request<Habit>(`/api/habits/${id}/log/${today()}?${t()}`, { method: "DELETE" }),

  goals: () => request<Goal[]>("/api/goals"),
  addGoal: (title: string, habitId: number | null, targetDate: string | null) => request<Goal>("/api/goals", json("POST", { title, habitId, targetDate })),
  setGoalStatus: (id: number, status: GoalStatus) => request<Goal>(`/api/goals/${id}`, json("PATCH", { status })),
  deleteGoal: (id: number) => request<void>(`/api/goals/${id}`, { method: "DELETE" }),
};
