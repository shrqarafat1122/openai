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
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium">API keys</h1>
        <Link
          href="/"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:border-accent"
        >
          ← Back to chat
        </Link>
      </div>

      <p className="mb-6 text-sm text-gray-400">
        Generate an OpenAI-compatible key to use this gateway from any tool.
        Point the tool&apos;s base URL at{" "}
        <code className="rounded bg-surface px-1 py-0.5 text-gray-200">
          {"<this-app>/v1"}
        </code>{" "}
        and use the key as a bearer token.
      </p>

      {/* Generate form */}
      <div className="mb-8 rounded-xl border border-border bg-surface p-4">
        <label className="mb-2 block text-sm text-gray-300">
          New key name (optional)
        </label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. VS Code, laptop, curl test"
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={generate}
            disabled={creating}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {creating ? "Generating…" : "Generate key"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Key list */}
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : keys.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-gray-500">
          No keys yet. Generate one above.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{k.name}</span>
                  {k.revoked && (
                    <span className="rounded bg-red-950/60 px-1.5 py-0.5 text-xs text-red-300">
                      revoked
                    </span>
                  )}
                </div>
                <div className="mt-0.5 font-mono text-xs text-gray-500">
                  {k.prefix} · created {fmt(k.createdAt)} · last used{" "}
                  {fmt(k.lastUsedAt)}
                </div>
              </div>
              {!k.revoked && (
                <button
                  onClick={() => revoke(k.id)}
                  className="ml-3 shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm text-red-300 hover:border-red-800 hover:bg-red-950/30"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6">
            <h2 className="mb-2 text-base font-medium">Copy your new key</h2>
            <p className="mb-4 text-sm text-yellow-300/90">
              This is the only time the full key is shown. Store it somewhere
              safe — you won&apos;t be able to see it again.
            </p>
            <div className="mb-4 break-all rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-gray-100">
              {rawKey}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={copyKey}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <button
                onClick={() => setRawKey(null)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
