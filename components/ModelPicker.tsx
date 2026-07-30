"use client";

interface ModelItem {
  id: string;
  providerName?: string;
}

export function ModelPicker({
  models,
  value,
  onChange,
  disabled,
}: {
  models: ModelItem[];
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}) {
  // Group models by providerName
  const groups: Record<string, ModelItem[]> = {};

  models.forEach((m) => {
    const groupName = m.providerName || "Standard Backend";
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(m);
  });

  const getCleanLabel = (id: string) => {
    if (id.includes("/")) {
      const label = id.split("/").slice(1).join("/");
      // Show friendly message for special markers
      if (label === "CONFIG_REQUIRED") return "⚠️ Add models in settings";
      if (label === "FETCH_ERROR") return "⚠️ Could not fetch models";
      return label;
    }
    return id;
  };

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="appearance-none rounded-xl border border-zinc-800/80 bg-zinc-950/60 hover:border-violet-500/60 text-zinc-200 px-10 py-2.5 text-xs font-semibold outline-none focus:border-violet-500 focus:shadow-glow-purple disabled:opacity-50 transition-all cursor-pointer shadow-sm backdrop-blur-sm"
      >
        {models.length === 0 && <option value="">Loading models…</option>}
        {Object.entries(groups).map(([groupName, groupModels]) => (
          <optgroup key={groupName} label={groupName} className="bg-zinc-950 text-zinc-400 font-semibold text-[10px] uppercase tracking-wider">
            {groupModels.map((m) => (
              <option key={m.id} value={m.id} className="text-zinc-200 font-normal normal-case font-sans text-xs py-1">
                {getCleanLabel(m.id)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
