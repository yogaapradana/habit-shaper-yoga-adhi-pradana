import { useEffect, useState } from "react";
import { api, Goal, GoalStatus, Habit } from "../api";

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [habitId, setHabitId] = useState("");
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    Promise.all([api.goals(), api.habits()])
      .then(([g, h]) => { setGoals(g); setHabits(h); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const attempt = async (fn: () => Promise<unknown>) => {
    try { setError(null); await fn(); } catch (e) { setError((e as Error).message); }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    attempt(async () => {
      await api.addGoal(title, habitId ? Number(habitId) : null, targetDate || null);
      setGoals(await api.goals());
      setTitle(""); setHabitId(""); setTargetDate("");
    });
  };

  const setStatus = (g: Goal, status: GoalStatus) =>
    attempt(async () => {
      const updated = await api.setGoalStatus(g.id, status);
      setGoals((list) => list.map((x) => (x.id === g.id ? updated : x)));
    });

  const remove = (g: Goal) => {
    if (!confirm(`Delete goal "${g.title}"?`)) return;
    attempt(async () => { await api.deleteGoal(g.id); setGoals((l) => l.filter((x) => x.id !== g.id)); });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card space-y-3 p-4">
        <input className="input" required maxLength={255} aria-label="Goal title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Run a 10K" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="goal-habit">Linked habit</label>
            <select id="goal-habit" className="input" value={habitId} onChange={(e) => setHabitId(e.target.value)}>
              <option value="">None</option>
              {habits.map((h) => <option key={h.id} value={h.id}>{h.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="goal-date">Target date</label>
            <input id="goal-date" type="date" className="input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary w-full" disabled={!title.trim()}>Add goal</button>
      </form>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {loading ? <p className="text-sm text-muted">Loading goals…</p> : goals.length === 0 ? (
        <p className="card px-4 py-10 text-center text-sm text-muted">No goals yet. Set a long-term target above.</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => (
            <li key={g.id} className={`card p-4 ${g.status !== "active" ? "opacity-70" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className={`font-medium ${g.status === "completed" ? "line-through" : ""}`}>{g.title}</h3>
                  <p className="mt-0.5 text-sm text-muted">
                    {g.habitTitle ? `Habit: ${g.habitTitle}` : "No linked habit"}
                    {g.targetDate && ` · by ${g.targetDate}`}
                  </p>
                </div>
                <button onClick={() => remove(g)} aria-label={`Delete ${g.title}`} className="shrink-0 text-xs text-muted hover:text-red-700">Delete</button>
              </div>
              <div className="mt-3">
                <label className="label" htmlFor={`status-${g.id}`}>Status</label>
                <select id={`status-${g.id}`} className="input max-w-[11rem]" value={g.status} onChange={(e) => setStatus(g, e.target.value as GoalStatus)}>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
