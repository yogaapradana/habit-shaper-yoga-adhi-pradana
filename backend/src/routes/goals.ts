import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../db";
import { requireAuth } from "../auth";
import { isDate, wrap } from "../utils";

interface GoalRow extends RowDataPacket {
  id: number;
  habit_id: number | null;
  habit_title: string | null;
  title: string;
  target_date: string | null;
  status: "active" | "completed" | "archived";
  created_at: string;
}

const STATUSES = ["active", "completed", "archived"];
const router = Router();
router.use(requireAuth);

const view = (g: GoalRow) => ({
  id: g.id,
  habitId: g.habit_id,
  habitTitle: g.habit_title,
  title: g.title,
  targetDate: g.target_date,
  status: g.status,
  createdAt: g.created_at,
});

const SELECT = `SELECT g.*, h.title AS habit_title FROM goals g LEFT JOIN habits h ON h.id = g.habit_id`;

async function habitBelongsToUser(userId: number, habitId: number) {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM habits WHERE id = ? AND user_id = ?", [habitId, userId]);
  return rows.length > 0;
}

router.get("/", wrap(async (_req, res) => {
  const [rows] = await pool.query<GoalRow[]>(
    `${SELECT} WHERE g.user_id = ? ORDER BY FIELD(g.status, 'active', 'completed', 'archived'), g.target_date IS NULL, g.target_date, g.id DESC`,
    [res.locals.userId]
  );
  res.json(rows.map(view));
}));

router.post("/", wrap(async (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  const habitId = req.body?.habitId ? Number(req.body.habitId) : null;
  const targetDate = req.body?.targetDate || null;

  if (!title || title.length > 255) return res.status(400).json({ error: "Title is required (max 255 characters)" });
  if (targetDate && !isDate(targetDate)) return res.status(400).json({ error: "Invalid target date" });
  if (habitId && !(await habitBelongsToUser(res.locals.userId, habitId))) return res.status(400).json({ error: "Habit not found" });

  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO goals (user_id, habit_id, title, target_date) VALUES (?, ?, ?, ?)",
    [res.locals.userId, habitId, title, targetDate]
  );
  const [rows] = await pool.query<GoalRow[]>(`${SELECT} WHERE g.id = ?`, [result.insertId]);
  res.status(201).json(view(rows[0]));
}));

router.patch("/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (typeof req.body?.title === "string" && req.body.title.trim()) {
    fields.push("title = ?");
    values.push(req.body.title.trim().slice(0, 255));
  }
  if (req.body?.status !== undefined) {
    if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: "Invalid status" });
    fields.push("status = ?");
    values.push(req.body.status);
  }
  if (req.body?.targetDate !== undefined) {
    if (req.body.targetDate && !isDate(req.body.targetDate)) return res.status(400).json({ error: "Invalid target date" });
    fields.push("target_date = ?");
    values.push(req.body.targetDate || null);
  }
  if (!fields.length) return res.status(400).json({ error: "Nothing to update" });

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE goals SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    [...values, id, res.locals.userId]
  );
  if (!result.affectedRows) return res.status(404).json({ error: "Goal not found" });

  const [rows] = await pool.query<GoalRow[]>(`${SELECT} WHERE g.id = ?`, [id]);
  res.json(view(rows[0]));
}));

router.delete("/:id", wrap(async (req, res) => {
  const [result] = await pool.query<ResultSetHeader>("DELETE FROM goals WHERE id = ? AND user_id = ?", [
    Number(req.params.id),
    res.locals.userId,
  ]);
  if (!result.affectedRows) return res.status(404).json({ error: "Goal not found" });
  res.status(204).end();
}));

export default router;
