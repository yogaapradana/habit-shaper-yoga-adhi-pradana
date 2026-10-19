# Habit Tracker: React + Express + MySQL on Docker

```
Browser -> Nginx :5173 (React build) --/api--> Express :5000 --> MySQL :3306
           (all three containers share the Docker network "app-network")
```

## Run
```bash
cp .env.example .env     # optional, defaults work without it
docker compose up --build
```
- App:   http://localhost:5173
- API:   http://localhost:5000/api/health
- MySQL: localhost:3306 (credentials from `.env`)

## Useful commands
```bash
docker compose logs -f backend
docker compose down          # stop
docker compose down -v       # stop and wipe the database volume
```

## Local dev (only the database in Docker)
```bash
docker compose up db -d
cd backend  && npm install && DB_HOST=localhost npm run dev
cd frontend && npm install && npm run dev
```

## Features
- **Register / login** with email + password (bcrypt hashes, JWT sessions valid for 7 days)
- **Habits** of two kinds: *build* (Done / Missed) and *break* (Clean / Relapsed), with current and best streaks
- **Daily check-in** per habit; tap the selected button again to undo
- **Weekly completion rate** per habit (Mon–Sun, last 6 weeks) with days done and days missed each week
- **Week-by-week grid** per habit (7 squares per row, Mon–Sun): tap any day to log, change or clear it; streaks update instantly
- **Goals** with an optional linked habit, target date, and status (active / completed / archived)

Set a real `JWT_SECRET` in `.env` before deploying anywhere public.

## REST API (all routes except auth need `Authorization: Bearer <token>`)
| Method | Path | Body |
|---|---|---|
| POST | /api/auth/register | `{ email, password }` |
| POST | /api/auth/login | `{ email, password }` |
| GET | /api/auth/me | |
| GET | /api/habits?today=YYYY-MM-DD | |
| POST | /api/habits | `{ title, description?, type: "build"\|"break" }` |
| PATCH | /api/habits/:id | `{ title?, description? }` |
| DELETE | /api/habits/:id | |
| POST | /api/habits/:id/log | `{ status, date? }` (build: completed/missed, break: clean/relapsed) |
| DELETE | /api/habits/:id/log/:date | undo a check-in |
| GET | /api/habits/:id/logs | history |
| GET/POST | /api/goals | `{ title, habitId?, targetDate? }` |
| PATCH/DELETE | /api/goals/:id | `{ title?, status?, targetDate? }` |

## Database
The schema (`users`, `habits`, `habit_logs`, `goals`) lives in `db/init.sql` and loads on the first start of an empty volume. After editing it, run `docker compose down -v` and start again.
