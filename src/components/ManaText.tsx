import { Fragment } from "react";

const SYMBOL_BG: Record<string, string> = {
  W: "#f6f1d3",
  U: "#a9cbe8",
  B: "#b9aea8",
  R: "#ec9b7c",
  G: "#9cc79a",
  C: "#d6d2cf",
};

function Symbol({ sym, size }: { sym: string; size: string }) {
  const s = sym.toUpperCase();
  const base = {
    width: size,
    height: size,
    fontSize: `calc(${size} * 0.68)`,
  };
  if (s === "T" || s === "Q") {
    return (
      <span className="mana-sym" style={{ ...base, background: "#d6d2cf" }} title={s === "T" ? "Tap" : "Untap"}>
        {s === "T" ? "↷" : "↶"}
      </span>
    );
  }
  const parts = s.split("/");
  const bg =
    parts.length === 2
      ? `linear-gradient(135deg, ${SYMBOL_BG[parts[0]] ?? "#d6d2cf"} 50%, ${SYMBOL_BG[parts[1]] ?? "#d6d2cf"} 50%)`
      : (SYMBOL_BG[s] ?? "#d6d2cf");
  return (
    <span className="mana-sym" style={{ ...base, background: bg }}>
      {parts.length === 2 ? "" : s}
    </span>
  );
}

/** Renders text with {W}, {2}, {T} style symbols as little coins. */
export function ManaText({ text, size = "1em" }: { text: string; size?: string }) {
  const parts = text.split(/(\{[^}]+\})/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\{[^}]+\}$/.test(p) ? <Symbol key={i} sym={p.slice(1, -1)} size={size} /> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}
