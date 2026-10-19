import { useEffect, useState } from "react";
import { api, getToken, setToken, setUnauthorizedHandler, User } from "./api";
import AuthForm from "./components/AuthForm";
import Habits from "./components/Habits";
import Goals from "./components/Goals";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(!!getToken());
  const [tab, setTab] = useState<"habits" | "goals">("habits");

  const logout = () => { setToken(null); setUser(null); };

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) return;
    api.me().then((r) => setUser(r.user)).catch(logout).finally(() => setChecking(false));
  }, []);

  if (checking) return <main className="p-10 text-sm text-muted">Loading…</main>;
  if (!user) return <AuthForm onAuth={setUser} />;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Habit Tracker</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <button className="btn-ghost" onClick={logout}>Log out</button>
      </header>

      <nav className="mb-6 flex gap-1 rounded-lg bg-line/60 p-1" aria-label="Sections">
        {(["habits", "goals"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} aria-current={tab === t}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize transition ${tab === t ? "bg-white shadow-sm" : "text-muted hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </nav>

      {tab === "habits" ? <Habits /> : <Goals />}
    </main>
  );
}
