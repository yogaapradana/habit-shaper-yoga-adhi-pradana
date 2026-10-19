import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../db";
import { requireAuth } from "../auth";
import { computeStreaks, Log } from "../streak";
import { isDate, localToday, wrap } from "../utils";

interface HabitRow extends RowDataPacket {
  id: number;
  title: string;
  description: string | null;
  type: "build" | "break";
  created_at: string;
}
interface LogRow extends RowDataPacket {
  habit_id: number;
  log_date: string;
  status: string;
}

const VALID_STATUS = {
  build: ["completed", "missed"],
  break: ["clean", "relapsed"],
} as const;

const router = Router();
router.use(requireAuth);

/** Loads habits (optionally one) with streaks computed from their logs. */
async function loadHabits(userId: number, today: string, habitId?: number) {
  const [habits] = await pool.query<HabitRow[]>(
    `SELECT id, title, description, type, created_at FROM habits
     WHERE user_id = ? ${habitId ? "AND id = ?" : ""} ORDER BY created_at DESC, id DESC`,
    habitId ? [userId, habitId] : [userId]
  );
  if (!habits.length) return [];

  const [logs] = await pool.query<LogRow[]>(
    "SELECT habit_id, log_date, status FROM habit_logs WHERE habit_id IN (?) ORDER BY log_date",
    [habits.map((h) => h.id)]
  );

  return habits.map((h) => {
    const own: Log[] = logs.filter((l) => l.habit_id === h.id).map((l) => ({ date: l.log_date, status: l.status }));
    const { current, best } = computeStreaks(own, today);
    return {
      id: h.id,
      title: h.title,
      description: h.description,
      type: h.type,
      currentStreak: current,
      bestStreak: best,
      todayStatus: own.find((l) => l.date === today)?.status ?? null,
      createdAt: h.created_at,
    };
  });
}

/** Writes the recomputed streaks back to the habits table. */
async function syncStreaks(habitId: number, today: string) {
  const [logs] = await pool.query<LogRow[]>("SELECT log_date, status FROM habit_logs WHERE habit_id = ?", [habitId]);
  const { current, best } = computeStreaks(logs.map((l) => ({ date: l.log_date, status: l.status })), today);
  await pool.query("UPDATE habits SET current_streak = ?, best_streak = ? WHERE id = ?", [current, best, habitId]);
}

async function ownedHabit(userId: number, id: number) {
  const [rows] = await pool.query<HabitRow[]>("SELECT * FROM habits WHERE id = ? AND user_id = ?", [id, userId]);
  return rows[0] ?? null;
}

const todayFrom = (v: unknown) => (isDate(v) ? v : localToday());

router.get("/", wrap(async (req, res) => {
  res.json(await loadHabits(res.locals.userId, todayFrom(req.query.today)));
}));

router.post("/", wrap(async (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  const description = String(req.body?.description ?? "").trim() || null;
  const type = req.body?.type;

  if (!title || title.length > 255) return res.status(400).json({ error: "Title is required (max 255 characters)" });
  if (type !== "build" && type !== "break") return res.status(400).json({ error: "Type must be 'build' or 'break'" });

  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO habits (user_id, title, description, type) VALUES (?, ?, ?, ?)",
    [res.locals.userId, title, description, type]
  );
  const [habit] = await loadHabits(res.locals.userId, todayFrom(req.query.today), result.insertId);
  res.status(201).json(habit);
}));

router.patch("/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await ownedHabit(res.locals.userId, id))) return res.status(404).json({ error: "Habit not found" });

  const fields: string[] = [];
  const values: (string | null)[] = [];
  if (typeof req.body?.title === "string" && req.body.title.trim()) {
    fields.push("title = ?");
    values.push(req.body.title.trim().slice(0, 255));
  }
  if (typeof req.body?.description === "string") {
    fields.push("description = ?");
    values.push(req.body.description.trim() || null);
  }
  if (!fields.length) return res.status(400).json({ error: "Nothing to update" });

  await pool.query(`UPDATE habits SET ${fields.join(", ")} WHERE id = ?`, [...values, id]);
  const [habit] = await loadHabits(res.locals.userId, todayFrom(req.query.today), id);
  res.json(habit);
}));

router.delete("/:id", wrap(async (req, res) => {
  const [result] = await pool.query<ResultSetHeader>("DELETE FROM habits WHERE id = ? AND user_id = ?", [
    Number(req.params.id),
    res.locals.userId,
  ]);
  if (!result.affectedRows) return res.status(404).json({ error: "Habit not found" });
  res.status(204).end();
}));

// History of one habit (newest first)
router.get("/:id/logs", wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await ownedHabit(res.locals.userId, id))) return res.status(404).json({ error: "Habit not found" });
  const [rows] = await pool.query<LogRow[]>(
    "SELECT log_date, status FROM habit_logs WHERE habit_id = ? ORDER BY log_date DESC LIMIT 365",
    [id]
  );
  res.json(rows.map((r) => ({ date: r.log_date, status: r.status })));
}));

// Check in for a day. Logging the same day again overwrites the earlier entry.
router.post("/:id/log", wrap(async (req, res) => {
  const id = Number(req.params.id);
  const habit = await ownedHabit(res.locals.userId, id);
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  const status = req.body?.status;
  if (!(VALID_STATUS[habit.type] as readonly string[]).includes(status)) {
    return res.status(400).json({ error: `Status for a '${habit.type}' habit must be ${VALID_STATUS[habit.type].join(" or ")}` });
  }
  const date = isDate(req.body?.date) ? req.body.date : localToday();

  await pool.query(
    "INSERT INTO habit_logs (habit_id, log_date, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)",
    [id, date, status]
  );
  await syncStreaks(id, todayFrom(req.body?.today ?? date));
  const [view] = await loadHabits(res.locals.userId, todayFrom(req.body?.today ?? date), id);
  res.json(view);
}));

// Undo a check-in
router.delete("/:id/log/:date", wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await ownedHabit(res.locals.userId, id))) return res.status(404).json({ error: "Habit not found" });
  if (!isDate(req.params.date)) return res.status(400).json({ error: "Invalid date" });

  await pool.query("DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ?", [id, req.params.date]);
  const today = todayFrom(req.query.today ?? req.params.date);
  await syncStreaks(id, today);
  const [view] = await loadHabits(res.locals.userId, today, id);
  res.json(view);
}));

export default router;
