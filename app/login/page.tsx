"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07070B] px-4 antialiased">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-8 shadow-2xl backdrop-blur-md relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-600 to-indigo-650" />

        <div className="mb-6 flex flex-col items-center">
          <div className="h-9 w-9 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-3 shadow-glow-purple">
            <span className="text-xs font-semibold text-violet-400 font-mono">&gt;_</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-white">AI Gateway Router</h1>
          <p className="mt-1 text-xs text-zinc-500 font-sans">Sign in to manage linked platforms</p>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-450 text-zinc-400">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder="name@domain.com"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder-zinc-700 outline-none focus:border-violet-500 transition-all font-sans"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-405 text-zinc-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder-zinc-700 outline-none focus:border-violet-500 transition-all font-sans"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/10 bg-red-950/20 px-3.5 py-2 text-xs text-red-350 text-red-305">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-650 px-4 py-2.5 text-xs font-medium text-white transition hover:opacity-95 disabled:opacity-50 shadow-glow-purple"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
