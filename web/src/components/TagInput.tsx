"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

// Chip-style list editor: existing values render as removable chips, new ones
// are added with the + button or Enter (also splits pasted comma/、-separated
// text). Replaces the old "comma-separated" free-text inputs.
export function TagInput({
  value,
  onChange,
  placeholder,
  addLabel,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const common = useTranslations("common");
  const [draft, setDraft] = useState("");

  const commit = () => {
    const parts = draft.split(/[,、・]/).map((x) => x.trim()).filter(Boolean);
    if (parts.length === 0) return;
    onChange([...new Set([...value, ...parts])]);
    setDraft("");
  };

  const remove = (tag: string) => onChange(value.filter((x) => x !== tag));

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-sm text-brand-dark"
            >
              <span className="[overflow-wrap:anywhere]">{tag}</span>
              <button
                type="button"
                onClick={() => remove(tag)}
                aria-label={`${common("remove")}: ${tag}`}
                className="grid h-4 w-4 place-items-center rounded-full text-brand-dark/60 hover:bg-brand/20 hover:text-brand-dark"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          className="field-input min-w-0 flex-1"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Don't hijack Enter while composing Japanese via IME.
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
        />
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={commit}
          disabled={!draft.trim()}
          aria-label={addLabel ?? common("add")}
        >
          ＋ {addLabel ?? common("add")}
        </button>
      </div>
    </div>
  );
}
