import { Router } from "express";
import bcrypt from "bcryptjs";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../db";
import { signToken, requireAuth } from "../auth";
import { wrap } from "../utils";

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
}

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", wrap(async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!EMAIL_RE.test(email) || email.length > 255) return res.status(400).json({ error: "Enter a valid email address" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const [existing] = await pool.query<UserRow[]>("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length) return res.status(409).json({ error: "That email is already registered" });

  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query<ResultSetHeader>("INSERT INTO users (email, password_hash) VALUES (?, ?)", [email, hash]);
  res.status(201).json({ token: signToken(result.insertId), user: { id: result.insertId, email } });
}));

router.post("/login", wrap(async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  const [rows] = await pool.query<UserRow[]>("SELECT * FROM users WHERE email = ?", [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }
  res.json({ token: signToken(user.id), user: { id: user.id, email: user.email } });
}));

router.get("/me", requireAuth, wrap(async (_req, res) => {
  const [rows] = await pool.query<UserRow[]>("SELECT id, email FROM users WHERE id = ?", [res.locals.userId]);
  if (!rows[0]) return res.status(401).json({ error: "Account no longer exists" });
  res.json({ user: { id: rows[0].id, email: rows[0].email } });
}));

export default router;
