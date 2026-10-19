import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

export const signToken = (userId: number) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    res.locals.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Session expired, please log in again" });
  }
}
