import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { pool, initDb } from "./db";
import { wrap } from "./utils";
import authRoutes from "./routes/auth";
import habitRoutes from "./routes/habits";
import goalRoutes from "./routes/goals";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", wrap(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok" });
}));

app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/goals", goalRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const port = Number(process.env.PORT ?? 5000);
initDb()
  .then(() => app.listen(port, () => console.log(`API listening on :${port}`)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
