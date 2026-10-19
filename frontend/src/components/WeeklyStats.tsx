import type { Habit } from "../api";
import { isPositive, weeklyStats } from "../weekly";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const rateTone = (rate: number) => (rate >= 80 ? "text-brand-dark" : rate >= 50 ? "text-amber-700" : "text-red-700");

interface Props {
  habit: Habit;
  onToggleDay: (date: string) => void;
}

export default function WeeklyStats({ habit, onToggleDay }: Props) {
  const weeks = weeklyStats(habit);
  const current = weeks[0];
  const todayKey = new Date().toLocaleDateString("en-CA");

  const tone = (s: string | undefined) =>
    s === undefined ? "bg-line/70 hover:bg-line" : isPositive(s) ? "bg-brand" : s === "missed" ? "bg-amber-400" : "bg-red-500";

  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <p className="font-medium">Weekly completion</p>
        <p className="text-muted">
          {current.days === 0 ? (
            "This week: no days counted yet"
          ) : (
            <>
              This week: <span className="font-medium text-ink">{current.done}/{current.days} days ({current.rate}%)</span>
              {" · "}
              <span className={current.missed ? "font-medium text-red-700" : ""}>{current.missed} missed</span>
            </>
          )}
        </p>
      </div>

      {/* weekday header, aligned with the squares below */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3" aria-hidden="true">
        <span className="w-[5.5rem] shrink-0" />
        <div className="grid w-[11.5rem] shrink-0 grid-cols-7 gap-1 text-center text-[10px] text-muted">
          {DAY_LETTERS.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      </div>

      <ul className="mt-1 space-y-1.5">
        {weeks.map((w) => (
          <li key={w.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className={`w-[5.5rem] shrink-0 ${w.isCurrent ? "font-medium text-ink" : "text-muted"}`}>{w.label}</span>

            <div className="grid w-[11.5rem] shrink-0 grid-cols-7 gap-1" role="group" aria-label={`Days of ${w.label}`}>
              {w.dates.map((d) => {
                const future = d > todayKey;
                const s = habit.history[d];
                return future ? (
                  <span key={d} className="aspect-square rounded-[4px] border border-dashed border-line" aria-hidden="true" />
                ) : (
                  <button
                    key={d}
                    onClick={() => onToggleDay(d)}
                    title={`${d}: ${s ?? "no entry"}`}
                    aria-label={`${d}: ${s ?? "no entry"}. Tap to change`}
                    className={`aspect-square rounded-[4px] ${tone(s)} ${d === todayKey ? "ring-2 ring-ink/40" : ""}`}
                  />
                );
              })}
            </div>

            <span className="min-w-[8rem] flex-1 text-right tabular-nums text-muted">
              {w.days === 0 ? "–" : (
                <>
                  {w.done}/{w.days} · <span className={`font-medium ${rateTone(w.rate)}`}>{w.rate}%</span> ·{" "}
                  <span className={w.missed ? "text-red-700" : ""}>{w.missed} missed</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        One row per week (Monday to Sunday), newest first. Tap a day to set it:{" "}
        {habit.type === "build" ? "done, missed, or clear" : "clean, relapsed, or clear"}. "Missed" counts every day not marked{" "}
        {habit.type === "build" ? "done" : "clean"}, including days with no entry.
      </p>
    </div>
  );
}
