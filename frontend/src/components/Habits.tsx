import { useEffect, useState } from "react";
import { api, Habit, HabitType, LogStatus } from "../api";
import { isPositive } from "../weekly";
import WeeklyStats from "./WeeklyStats";

const ACTIONS: Record<HabitType, { status: LogStatus; label: string; tone: string }[]> = {
  build: [
    { status: "completed", label: "Done today", tone: "bg-brand text-white border-brand" },
    { status: "missed", label: "Missed", tone: "bg-amber-100 text-amber-900 border-amber-300" },
  ],
  break: [
    { status: "clean", label: "Clean today", tone: "bg-brand text-white border-brand" },
    { status: "relapsed", label: "Relapsed", tone: "bg-red-100 text-red-900 border-red-300" },
  ],
};

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<HabitType>("build");

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toLocaleDateString("en-CA");
  });

  const load = () =>
    api.habits().then(setHabits).catch((e) => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const replace = (h: Habit) => setHabits((list) => list.map((x) => (x.id === h.id ? h : x)));
  const attempt = async (fn: () => Promise<unknown>) => {
    try { setError(null); await fn(); } catch (e) { setError((e as Error).message); }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    attempt(async () => {
      const h = await api.addHabit(title, description, type);
      setHabits((list) => [h, ...list]);
      setTitle(""); setDescription("");
    });
  };

  const check = (h: Habit, status: LogStatus) =>
    attempt(async () => replace(h.todayStatus === status ? await api.undoLog(h.id) : await api.logHabit(h.id, status)));

  // Tap a day to cycle: empty -> positive -> negative -> empty
  const cycleDay = (h: Habit, date: string) =>
    attempt(async () => {
      const [pos, neg] = ACTIONS[h.type].map((a) => a.status);
      const cur = h.history[date] ?? null;
      const next = cur === null ? pos : cur === pos ? neg : null;
      replace(next === null ? await api.undoLog(h.id, date) : await api.logHabit(h.id, next, date));
    });

  const remove = (h: Habit) => {
    if (!confirm(`Delete "${h.title}" and its history?`)) return;
    attempt(async () => { await api.deleteHabit(h.id); setHabits((l) => l.filter((x) => x.id !== h.id)); });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card space-y-3 p-4">
        <div className="flex gap-2" role="group" aria-label="Habit type">
          {(["build", "break"] as HabitType[]).map((t) => (
            <button type="button" key={t} aria-pressed={type === t} onClick={() => setType(t)}
              className={`btn flex-1 border ${type === t ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white text-muted"}`}>
              {t === "build" ? "Build a habit" : "Break a habit"}
            </button>
          ))}
        </div>
        <input className="input" required maxLength={255} aria-label="Habit title" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={type === "build" ? "e.g. Read 20 minutes" : "e.g. No social media before noon"} />
        <input className="input" aria-label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why does this matter? (optional)" />
        <button className="btn-primary w-full" disabled={!title.trim()}>Add habit</button>
      </form>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {loading ? <p className="text-sm text-muted">Loading habits…</p> : habits.length === 0 ? (
        <p className="card px-4 py-10 text-center text-sm text-muted">No habits yet. Add your first one above.</p>
      ) : (
        <ul className="space-y-3">
          {habits.map((h) => (
            <li key={h.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium">{h.title}</h3>
                    <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-[11px] text-muted">{h.type === "build" ? "build" : "break"}</span>
                  </div>
                  {h.description && <p className="mt-0.5 text-sm text-muted">{h.description}</p>}
                </div>
                <button onClick={() => remove(h)} aria-label={`Delete ${h.title}`} className="shrink-0 text-xs text-muted hover:text-red-700">Delete</button>
              </div>

              <div className="mt-3 flex items-end gap-6 text-sm">
                <p>
                  <span className="text-3xl font-semibold tabular-nums text-brand">{h.currentStreak}</span>{" "}
                  <span className="text-muted">{h.type === "build" ? "days in a row" : "days clean"}</span>
                </p>
                <p className="text-muted">Best: <span className="font-medium text-ink">{h.bestStreak}</span></p>
                <p className="text-muted">Last 30 days: <span className="font-medium text-ink">{days.filter((d) => isPositive(h.history[d])).length}</span></p>
              </div>

              <WeeklyStats habit={h} onToggleDay={(date) => cycleDay(h, date)} />

              <div className="mt-4 flex gap-2">
                {ACTIONS[h.type].map((a) => (
                  <button key={a.status} aria-pressed={h.todayStatus === a.status} onClick={() => check(h, a.status)}
                    className={`btn flex-1 border ${h.todayStatus === a.status ? a.tone : "border-line bg-white text-ink hover:bg-paper"}`}>
                    {a.label}
                  </button>
                ))}
              </div>
              {h.todayStatus && <p className="mt-2 text-xs text-muted">Tap the selected button again to undo.</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
