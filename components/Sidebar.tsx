"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function Sidebar({
  onNewChat,
  userEmail,
}: {
  onNewChat: () => void;
  userEmail?: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-64 flex-col border-r border-zinc-800/40 bg-[#07070B]/95 backdrop-blur-md">
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-300 hover:border-violet-500/60 hover:bg-zinc-900/30 transition-all shadow-sm hover:shadow-glow-purple"
        >
          + New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 text-sm text-gray-500">
        {/* Chat history list — populated as chats persist. */}
      </div>

      <div className="border-t border-zinc-800/40 p-3 text-xs text-gray-400">
        <Link
          href="/settings/providers"
          className="block rounded-lg px-2 py-2 hover:bg-zinc-900/50 hover:text-violet-300 transition-all"
        >
          Linked providers
        </Link>
        <Link
          href="/settings/keys"
          className="mt-1 block rounded-lg px-2 py-2 hover:bg-zinc-900/50 hover:text-violet-300 transition-all"
        >
          Gateway keys
        </Link>
        <button
          onClick={logout}
          className="mt-1 block w-full rounded-lg px-2 py-2 text-left hover:bg-red-950/20 hover:text-red-400 transition-all"
        >
          Log out
        </button>
        {userEmail && (
          <div className="mt-2 truncate px-2 text-zinc-600 text-[11px] font-mono">{userEmail}</div>
        )}
      </div>
    </aside>
  );
}
