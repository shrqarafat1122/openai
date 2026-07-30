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
    <aside className="flex w-64 flex-col border-r border-border bg-surface">
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm font-medium hover:border-accent"
        >
          + New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 text-sm text-gray-500">
        {/* Chat history list — populated as chats persist. */}
      </div>

      <div className="border-t border-border p-3 text-xs text-gray-400">
        <Link
          href="/settings/providers"
          className="block rounded-lg px-2 py-2 hover:bg-bg hover:text-gray-100"
        >
          Linked providers
        </Link>
        <Link
          href="/settings/keys"
          className="mt-1 block rounded-lg px-2 py-2 hover:bg-bg hover:text-gray-100"
        >
          Gateway keys
        </Link>
        <button
          onClick={logout}
          className="mt-1 block w-full rounded-lg px-2 py-2 text-left hover:bg-bg hover:text-gray-100"
        >
          Log out
        </button>
        {userEmail && (
          <div className="mt-2 truncate px-2 text-gray-600">{userEmail}</div>
        )}
      </div>
    </aside>
  );
}
