"use client";

import { useEffect, useState } from "react";
import { autocomplete } from "@/lib/scryfall";

/** Text box that suggests card names from Scryfall as you type. */
export function CardSearch({ onPick, placeholder }: { onPick: (name: string) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => autocomplete(q).then((r) => (setResults(r.slice(0, 10)), setActive(0))), 200);
    return () => clearTimeout(t);
  }, [q]);

  const pick = (name: string) => {
    setQ(name);
    setOpen(false);
    onPick(name);
  };
  const shown = q.trim().length < 2 ? [] : results;

  return (
    <div className="relative">
      <input
        className="input"
        value={q}
        placeholder={placeholder ?? "Type a card name"}
        onChange={(e) => (setQ(e.target.value), setOpen(true))}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, shown.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter" && shown[active]) {
            e.preventDefault();
            pick(shown[active]);
          }
        }}
      />
      {open && shown.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-white/10 bg-neutral-900 py-1 shadow-xl">
          {shown.map((name, i) => (
            <li key={name}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(name)}
                className={`block w-full px-3 py-1.5 text-left text-sm ${i === active ? "bg-amber-500 text-black" : "text-neutral-200 hover:bg-white/10"}`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
