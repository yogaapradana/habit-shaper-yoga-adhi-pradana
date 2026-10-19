import type { Request, Response, NextFunction } from "express";

/** Express 4 doesn't catch rejected promises; wrap async handlers. */
export const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export const localToday = () => new Date().toISOString().slice(0, 10);
