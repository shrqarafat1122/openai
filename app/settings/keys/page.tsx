"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  createdAt: number;
  lastUsedAt: number | null;
  revoked: boolean;
}

function fmt(ts: number | null): string {
  if (!ts) return "never";
  return new Date(ts).toLocaleString();
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New-key form + one-time reveal.
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/keys");
      if (!res.ok) throw new Error(`Failed to load keys (${res.status})`);
      const d = await res.json();
      setKeys(d.keys ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function generate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error(`Failed to create key (${res.status})`);
      const d = await res.json();
      setRawKey(d.rawKey);
      setCopied(false);
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Tools using it will stop working immediately.")) {
      return;
    }
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to revoke (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke key");
    }
  }

  async function copyKey() {
    if (!rawKey) return;
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
    } catch {
      // Clipboard may be blocked; the key is still visible to copy manually.
    }
  }

  return (
    <div className="min-h-screen bg-[#07070B] text-zinc-300 px-4 py-8 antialiased">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Gateway API Keys</h1>
            <p className="mt-1 text-xs text-zinc-500 font-sans">
              Generate credentials to route external workloads through the gateway.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition-all"
          >
            ← Chat
          </Link>
        </div>

        <p className="mb-6 text-xs text-zinc-400 leading-relaxed">
          Point your tool&apos;s base URL at{" "}
          <code className="rounded bg-zinc-950/80 border border-zinc-800/60 px-1.5 py-0.5 font-mono text-zinc-200">
            {"<this-app>/v1"}
          </code>{" "}
          and supply the generated key as a bearer token.
        </p>

        {/* Generate form */}
        <div className="mb-8 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5 backdrop-blur-md transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            New Key Name
          </label>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. VS Code, Cursor, laptop, staging"
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder-zinc-650 outline-none focus:border-violet-500 transition-all font-sans"
            />
            <button
              onClick={generate}
              disabled={creating}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-650 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 transition-all shadow-glow-purple select-none hover:opacity-95"
            >
              {creating ? "Generating…" : "Generate key"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-900/40 bg-red-950/20 px-3.5 py-2.5 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Key list */}
        {loading ? (
          <div className="text-xs text-zinc-550 animate-pulse">Loading gateway credentials...</div>
        ) : keys.length === 0 ? (
          <div className="rounded-xl border border-zinc-850/80 bg-zinc-950/20 p-8 text-center backdrop-blur-md">
            No gateway keys configure. Generate one above.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/20 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white">{k.name}</span>
                    {k.revoked && (
                      <span className="rounded bg-red-950/50 border border-red-900/30 px-1.5 py-0.5 text-[10px] text-red-400">
                        revoked
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-zinc-450 leading-relaxed">
                    {k.prefix} · created {fmt(k.createdAt)} · last used {fmt(k.lastUsedAt)}
                  </div>
                </div>
                {!k.revoked && (
                  <button
                    onClick={() => revoke(k.id)}
                    className="ml-3 shrink-0 rounded-lg border border-zinc-850 px-3 py-1.5 text-xs text-red-400 hover:border-red-800/40 hover:bg-red-950/10 transition-all"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* One-time reveal modal */}
        {rawKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl border border-zinc-850 bg-zinc-950 p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 to-indigo-650" />
              <h2 className="mb-2 text-base font-semibold text-white">Copy your secret gateway key</h2>
              <p className="mb-4 text-xs text-yellow-300/80 leading-relaxed font-sans">
                This is the only time the private key is displayed. Save it in a safe storage location. You will not be able to retrieve it again.
              </p>
              <div className="mb-4 break-all rounded-lg border border-zinc-800 bg-[#07070B] px-3.5 py-3 font-mono text-sm text-zinc-150 shadow-inner select-all">
                {rawKey}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900">
                <button
                  onClick={copyKey}
                  className="rounded-lg border border-zinc-800 bg-transparent px-4 py-2 text-xs font-semibold hover:bg-zinc-900 transition-all"
                >
                  {copied ? "Copied ✓" : "Copy to Clipboard"}
                </button>
                <button
                  onClick={() => setRawKey(null)}
                  className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-650 px-4 py-2 text-xs font-semibold text-white hover:opacity-95 transition-all shadow-glow-purple"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
