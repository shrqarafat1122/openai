"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KeyTagInput } from "@/components/KeyTagInput";
import { Shield, Server, Edit, Trash2, Plus, Check, X, ToggleLeft, ToggleRight, Settings } from "lucide-react";

interface ProviderRecord {
  id: string;
  providerType: "openai" | "anthropic" | "custom";
  displayName: string;
  baseUrl: string;
  apiKeys: string[];
  apiHeaders: Record<string, string>;
  manualModels?: string[];
  enabled: boolean;
  createdAt: number;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [editId, setEditId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [providerType, setProviderType] = useState<"openai" | "anthropic" | "custom">("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [manualModels, setManualModels] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/providers");
      if (!res.ok) throw new Error(`Failed to load providers (${res.status})`);
      const d = await res.json();
      setProviders(d.providers ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load providers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return setError("Display name is required.");
    if (providerType !== "custom" && apiKeys.length === 0) return setError("At least one API key is required.");
    if (providerType === "custom" && !baseUrl.trim()) return setError("Base URL is required for custom providers.");

    setSubmitting(true);
    setError(null);

    const payload = {
      providerType,
      displayName: displayName.trim(),
      baseUrl: providerType === "custom" ? baseUrl.trim() : (providerType === "anthropic" ? "https://api.anthropic.com/v1" : "https://api.openai.com/v1"),
      apiKeys,
      apiHeaders: {},
      manualModels: providerType === "custom" ? manualModels : [],
      enabled: true,
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`/api/providers/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const bodyObj = await res.json().catch(() => null);
        throw new Error(bodyObj?.error ?? "Request failed");
      }

      setDisplayName("");
      setBaseUrl("");
      setApiKeys([]);
      setManualModels([]);
      setEditId(null);
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleEnabled(item: ProviderRecord) {
    try {
      const res = await fetch(`/api/providers/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !item.enabled }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to toggle status");
    }
  }

  async function remove(id: string) {
    if (!confirm("Are you sure you want to delete this provider configuration? All associated dynamic models will stop functioning.")) {
      return;
    }
    try {
      const res = await fetch(`/api/providers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete provider");
    }
  }

  function startEdit(item: ProviderRecord) {
    setEditId(item.id);
    setDisplayName(item.displayName);
    setProviderType(item.providerType);
    setBaseUrl(item.baseUrl);
    setApiKeys(item.apiKeys);
    setManualModels(item.manualModels ?? []);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#07070B] text-zinc-150 px-4 py-8 antialiased">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-violet-400" /> Linked Providers
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Connect external AI platforms with rotation and fallback API keys.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition-all"
            >
              ← Chat
            </Link>
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (editId) {
                  setEditId(null);
                  setDisplayName("");
                  setBaseUrl("");
                  setApiKeys([]);
                  setManualModels([]);
                }
              }}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-650 px-3.5 py-2 text-xs font-medium text-white hover:opacity-90 transition-all flex items-center gap-1 shadow-glow-purple"
            >
              {showForm && !editId ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showForm && !editId ? "Close Panel" : "Add Provider"}
            </button>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2.5 text-xs text-red-300 flex items-center justify-between">
            <div className="truncate pr-4">{error}</div>
            <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Configuration panels */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5 backdrop-blur-md transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Settings className="h-3.5 w-3.5 text-violet-400" />
              {editId ? "Update Configuration" : "New Provider Configuration"}
            </h2>

            <div className="grid gap-4 mb-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">Provider Type</label>
                <div className="flex gap-2">
                  {(["openai", "anthropic", "custom"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setProviderType(t);
                        if (t === "anthropic") setBaseUrl("https://api.anthropic.com/v1");
                        else if (t === "openai") setBaseUrl("https://api.openai.com/v1");
                      }}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-all ${
                        providerType === t
                          ? "border-violet-500 bg-violet-600/10 text-violet-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                          : "border-zinc-800 bg-zinc-900/20 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">Display Label</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. My OpenAI, Secondary Anthropic"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500 transition-all font-sans"
                />
              </div>

              {providerType === "custom" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">Base API Endpoint URL</label>
                  <input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="e.g. https://api.deepseek.com/v1, http://127.0.0.1:11434/v1"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500 transition-all font-mono"
                  />
                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                      Manual Model IDs <span className="text-zinc-500 font-normal">(optional — set when the endpoint has no /models)</span>
                    </label>
                    <KeyTagInput
                      value={manualModels}
                      onChange={setManualModels}
                      placeholder="e.g. deepseek-chat, deepseek-reasoner..."
                    />
                    <p className="mt-1.5 text-[11px] text-zinc-500 leading-normal">
                      Leave empty to auto-discover from <span className="font-mono text-zinc-400">GET /models</span>. Add IDs here for OpenAI-compatible backends that only implement <span className="font-mono text-zinc-400">/chat/completions</span>.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  API Key Tags <span className="text-zinc-500 font-normal">(commas split multiple keys)</span>
                </label>
                <KeyTagInput
                  value={apiKeys}
                  onChange={setApiKeys}
                  placeholder="Enter secret API key and press enter..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-900 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setDisplayName("");
                  setBaseUrl("");
                  setApiKeys([]);
                  setManualModels([]);
                }}
                className="rounded-lg border border-zinc-800 bg-transparent px-4 py-2 text-xs font-medium hover:bg-zinc-900 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-650 px-4 py-2 text-xs font-medium text-white hover:opacity-95 disabled:opacity-40 transition-all shadow-glow-purple"
              >
                {submitting ? "Applying..." : editId ? "Update Link" : "Establish Link"}
              </button>
            </div>
          </form>
        )}

        {/* Existing Providers list */}
        {loading ? (
          <div className="py-20 text-center text-xs text-zinc-500 animate-pulse">Synchronizing configurations...</div>
        ) : providers.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/20 p-12 text-center backdrop-blur-md border-dashed">
            <Server className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">No custom providers configured</h3>
            <p className="text-xs text-zinc-500 leading-normal max-w-sm mx-auto mb-4">
              Without custom settings, the gateway defaults back to the backend environmental credentials defined in your server environment variables.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg border border-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-900 transition-all"
            >
              Add first provider
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {providers.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl border transition-all p-4 backdrop-blur-sm ${
                  p.enabled
                    ? "border-zinc-800/60 bg-zinc-950/30 hover:border-violet-500/20 hover:shadow-glow-purple"
                    : "border-zinc-900 bg-zinc-950/10 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{p.displayName}</span>
                      <span className="rounded-md bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-mono capitalize tracking-wide text-zinc-400">
                        {p.providerType}
                      </span>
                      {!p.enabled && (
                        <span className="rounded bg-red-950/50 border border-red-900/30 px-1.5 py-0.5 text-[10px] text-red-400">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-[11px] text-zinc-400 font-mono truncate max-w-md">
                      Endpoint: {p.baseUrl}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1 items-center">
                      <Shield className="h-3 w-3 text-zinc-500 mr-1" />
                      {p.apiKeys.map((k, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-zinc-900/60 border border-zinc-950 px-1.5 py-0.5 text-[10px] font-mono text-zinc-350"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-4 shrink-0">
                    <button
                      onClick={() => toggleEnabled(p)}
                      title={p.enabled ? "Disable" : "Enable"}
                      className="rounded p-1.5 hover:bg-zinc-900 hover:text-white transition-all text-zinc-400"
                    >
                      {p.enabled ? (
                        <ToggleRight className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-zinc-650" />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(p)}
                      title="Edit"
                      className="rounded p-1.5 hover:bg-zinc-900 hover:text-white transition-all text-zinc-405"
                    >
                      <Edit className="h-4.5 w-4.5 text-zinc-400" />
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      title="Delete"
                      className="rounded p-1.5 hover:bg-zinc-900 hover:text-red-400 transition-all text-zinc-405"
                    >
                      <Trash2 className="h-4.5 w-4.5 text-zinc-405 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
