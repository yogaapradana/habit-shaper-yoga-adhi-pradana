import type { Habit } from "./api";

export interface WeekStat {
  label: string;
  isCurrent: boolean;
  days: number;   // days counted in this week (elapsed, and not before the habit started)
  done: number;   // completed / clean
  missed: number; // every counted day that is not done (missed, relapsed, or not logged)
  rate: number;   // done / days, 0-100
  dates: string[]; // the 7 days of the week, Monday to Sunday (YYYY-MM-DD)
}

export const isPositive = (s: string | undefined) => s === "completed" || s === "clean";

const ymd = (d: Date) => d.toLocaleDateString("en-CA");
const short = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Calendar weeks (Monday to Sunday), newest first. */
export function weeklyStats(h: Habit, weeks = 6): WeekStat[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  // Days before the habit existed shouldn't count as missed.
  const created = ymd(new Date(h.createdAt.replace(" ", "T") + "Z"));
  const start = [created, ...Object.keys(h.history)].sort()[0];

  const out: WeekStat[] = [];
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(thisMonday);
    weekStart.setDate(thisMonday.getDate() - 7 * w);
    let days = 0;
    let done = 0;
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = ymd(d);
      dates.push(key);
      if (d > now) continue;
      if (key < start) continue;
      if (d.getTime() === now.getTime() && !h.history[key]) continue; // today is still open, not missed yet
      days++;
      if (isPositive(h.history[key])) done++;
    }
    if (days === 0 && w !== 0) continue;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    out.push({
      label: w === 0 ? "This week" : `${short(weekStart)} – ${short(weekEnd)}`,
      isCurrent: w === 0,
      days,
      done,
      missed: days - done,
      rate: days ? Math.round((done / days) * 100) : 0,
      dates,
    });
  }
  return out;
}
