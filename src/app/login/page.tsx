"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { login, register } from "@/lib/authClient";

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  // Guests arriving to upgrade land on the register tab; their guest account
  // is converted in place, keeping their rating and history.
  const upgrading = params.get("upgrade") === "1";
  const [tab, setTab] = useState<"login" | "register">(upgrading ? "register" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (tab === "login") await login(username, password);
      else await register(username, password);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
      </nav>
      <section className="max-w-md mx-auto px-6 py-8">
        <h1 className="font-display text-4xl">
          {tab === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-parchment-200 text-sm">
          {upgrading
            ? "Pick a username and password. Your guest rating, games, and member date carry over."
            : "An account gives you rated online games, a real rating, game history, and a spot on the leaderboard."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-1 plate p-1">
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setError(null);
              }}
              className={
                "py-2 text-sm font-display font-semibold tracking-wide transition " +
                (tab === t ? "bg-gold/15 text-gold-leaf" : "text-parchment-300 hover:bg-white/5")
              }
            >
              {t === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-4 plate p-6 space-y-4">
          {error && (
            <div className="p-3 border border-oxblood-glow/60 bg-oxblood/15 text-parchment text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="smallcaps text-[11px] text-parchment-400 block mb-1.5" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              maxLength={20}
              className="w-full bg-ink-900/60 border border-white/15 rounded-sm px-4 py-3 focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/40"
              placeholder="knight_rider"
            />
            {tab === "register" && (
              <p className="mt-1 text-[11px] text-parchment-400">
                3–20 characters: letters, digits, underscores.
              </p>
            )}
          </div>
          <div>
            <label className="smallcaps text-[11px] text-parchment-400 block mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              className="w-full bg-ink-900/60 border border-white/15 rounded-sm px-4 py-3 focus:outline-none focus:border-gold/60 text-parchment"
              placeholder={tab === "register" ? "at least 8 characters" : ""}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !username.trim() || !password}
            className="w-full py-3 rounded-sm btn-leaf font-body text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "One moment…" : tab === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
