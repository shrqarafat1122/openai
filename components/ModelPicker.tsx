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
      return id.split("/").slice(1).join("/");
    }
    return id;
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-lg border border-border bg-surface hover:border-accent text-zinc-200 px-3.5 py-1.5 text-xs font-medium outline-none focus:border-accent disabled:opacity-50 transition-all cursor-pointer shadow-sm select-none"
    >
      {models.length === 0 && <option value="">Loading models…</option>}
      {Object.entries(groups).map(([groupName, groupModels]) => (
        <optgroup key={groupName} label={groupName} className="bg-surface text-zinc-400 font-semibold text-[10px] uppercase tracking-wider">
          {groupModels.map((m) => (
            <option key={m.id} value={m.id} className="text-zinc-200 font-normal normal-case font-sans text-xs">
              {getCleanLabel(m.id)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
