export interface Log {
  date: string; // YYYY-MM-DD
  status: string;
}

const POSITIVE = new Set(["completed", "clean"]);

const dayNumber = (s: string) => Math.floor(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86_400_000);

/**
 * A streak is a run of consecutive days with a positive status
 * (completed / clean). A missed or relapsed day, or a gap, ends it.
 * The current streak stays alive if the last entry is today or yesterday.
 */
export function computeStreaks(logs: Log[], today: string) {
  const sorted = [...logs].sort((a, b) => (a.date < b.date ? -1 : 1));
  let run = 0;
  let best = 0;
  let lastDay = -Infinity;

  for (const log of sorted) {
    const d = dayNumber(log.date);
    if (POSITIVE.has(log.status)) {
      run = run > 0 && d === lastDay + 1 ? run + 1 : 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    lastDay = d;
  }

  const current = run > 0 && lastDay >= dayNumber(today) - 1 ? run : 0;
  return { current, best };
}
