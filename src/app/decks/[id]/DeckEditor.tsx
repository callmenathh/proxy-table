"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CardView } from "@/components/CardView";
import { ManaText } from "@/components/ManaText";
import { parseDecklist } from "@/lib/decklist";
import { autocomplete, resolveLines } from "@/lib/scryfall";
import { useLibrary } from "@/lib/store";
import type { Deck, DeckCard } from "@/lib/types";
import { customToDeckCard } from "@/lib/types";
import { validateCommander } from "@/lib/validate";
import { ProxyDialog } from "./ProxyDialog";

const GROUPS = ["Creature", "Planeswalker", "Battle", "Instant", "Sorcery", "Artifact", "Enchantment", "Land"];

function groupOf(c: DeckCard) {
  if (c.isCommander) return "Commander";
  const front = c.typeLine.split(" // ")[0];
  return GROUPS.find((g) => front.includes(g)) ?? "Other";
}

export function DeckEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrated, decks, customCards, saveDeck, deleteDeck } = useLibrary();
  const deck = decks.find((d) => d.id === id);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [hovered, setHovered] = useState<DeckCard | null>(null);
  const [proxyFor, setProxyFor] = useState<DeckCard | null>(null);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => autocomplete(search).then(setSuggestions), 200);
    return () => clearTimeout(t);
  }, [search]);

  const problems = useMemo(() => (deck ? validateCommander(deck) : []), [deck]);
  const groups = useMemo(() => {
    const map = new Map<string, DeckCard[]>();
    for (const c of deck?.cards ?? []) map.set(groupOf(c), [...(map.get(groupOf(c)) ?? []), c]);
    return ["Commander", ...GROUPS, "Other"].filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const);
  }, [deck]);

  if (!hydrated) return <p className="p-6 text-neutral-500">Loading…</p>;
  if (!deck)
    return (
      <p className="p-6 text-neutral-400">
        Deck not found. <Link href="/decks" className="text-amber-300 underline">Back to decks</Link>
      </p>
    );

  const update = (patch: Partial<Deck>) => saveDeck({ ...deck, ...patch });
  const updateCard = (uid: string, patch: Partial<DeckCard>) =>
    update({ cards: deck.cards.map((c) => (c.uid === uid ? { ...c, ...patch } : c)) });

  const importList = async (replace: boolean, source = text) => {
    const lines = parseDecklist(source);
    if (!lines.length) return;
    setBusy(true);
    setStatus("Looking up cards…");
    try {
      // Custom cards in the library match by name before Scryfall is asked.
      const byName = new Map(customCards.map((c) => [c.name.toLowerCase(), c]));
      const custom: DeckCard[] = [];
      const official = lines.filter((l) => {
        const hit = byName.get(l.name.toLowerCase());
        if (hit) custom.push({ ...customToDeckCard(hit, l.qty), isCommander: l.isCommander });
        return !hit;
      });
      const { cards, notFound } = await resolveLines(official);
      const added = [...custom, ...cards];
      const merged = replace ? added : mergeCards(deck.cards, added);
      update({ cards: merged, unresolved: [...(replace ? [] : deck.unresolved), ...notFound.map((l) => l.name)] });
      setStatus(`Added ${added.reduce((n, c) => n + c.qty, 0)} cards.${notFound.length ? ` ${notFound.length} not found.` : ""}`);
      if (source === text) setText("");
    } catch (e) {
      setStatus(`Import failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const total = deck.cards.reduce((n, c) => n + c.qty, 0);

  return (
    <main className="grid flex-1 gap-6 p-5 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
      <aside className="flex flex-col gap-4">
        <input className="input text-lg font-semibold" value={deck.name} onChange={(e) => update({ name: e.target.value })} />
        <div className="flex gap-2">
          <Link href={`/play/${deck.id}`} className="btn-primary">
            Play solo
          </Link>
          <button
            className="btn"
            onClick={() => {
              if (!confirm(`Delete ${deck.name}?`)) return;
              deleteDeck(deck.id);
              router.push("/decks");
            }}
          >
            Delete deck
          </button>
        </div>

        <div>
          <span className="label">Paste a decklist</span>
          <textarea
            className="input min-h-48 font-mono text-xs"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring\n1x Arcane Signet (CMM) 367\n..."}
          />
          <div className="mt-2 flex gap-2">
            <button className="btn-primary" disabled={busy || !text.trim()} onClick={() => importList(false)}>
              Add to deck
            </button>
            <button className="btn" disabled={busy || !text.trim()} onClick={() => importList(true)}>
              Replace deck
            </button>
          </div>
          {status && <p className="mt-2 text-sm text-neutral-400">{status}</p>}
        </div>

        <div>
          <span className="label">Add one card</span>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (search.trim()) importList(false, `1 ${search.trim()}`).then(() => setSearch(""));
            }}
          >
            <input className="input" list="card-suggestions" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Scryfall" />
            <datalist id="card-suggestions">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <button className="btn shrink-0" disabled={busy}>
              Add
            </button>
          </form>
        </div>

        <div>
          <span className="label">Add a card you made</span>
          {customCards.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Make one in the <Link href="/creator" className="text-amber-300 underline">creator</Link> first.
            </p>
          ) : (
            <select
              className="input"
              value=""
              onChange={(e) => {
                const c = customCards.find((x) => x.id === e.target.value);
                if (c) update({ cards: mergeCards(deck.cards, [customToDeckCard(c)]) });
              }}
            >
              <option value="">Choose a card…</option>
              {customCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || "Untitled"}
                </option>
              ))}
            </select>
          )}
        </div>

        {(problems.length > 0 || deck.unresolved.length > 0) && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-100">
            {problems.map((p) => (
              <p key={p} className="mb-1">
                {p}
              </p>
            ))}
            {deck.unresolved.length > 0 && (
              <div className="mt-2">
                <p>Not found on Scryfall: {deck.unresolved.join(", ")}.</p>
                <button className="mt-1 text-xs text-amber-300 underline" onClick={() => update({ unresolved: [] })}>
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      <section>
        <p className="mb-3 text-sm text-neutral-400">{total} cards</p>
        {groups.map(([group, cards]) => (
          <div key={group} className="mb-6">
            <h3 className="label">
              {group} ({cards.reduce((n, c) => n + c.qty, 0)})
            </h3>
            <div className="flex flex-wrap gap-3">
              {cards.map((c) => (
                <div key={c.uid} className="group relative" onMouseEnter={() => setHovered(c)}>
                  <CardView card={c} width={146} />
                  {c.qty > 1 && (
                    <span className="absolute left-1 top-1 rounded bg-black/80 px-1.5 text-xs font-bold text-white">×{c.qty}</span>
                  )}
                  {(c.proxyImage || c.source === "custom") && (
                    <span className="absolute right-1 top-1 rounded bg-amber-500 px-1.5 text-[10px] font-bold text-black">
                      {c.source === "custom" ? "CUSTOM" : "PROXY"}
                    </span>
                  )}
                  <div className="absolute inset-x-1 bottom-1 hidden flex-wrap justify-center gap-1 rounded bg-black/85 p-1 group-hover:flex">
                    <Tiny title={c.isCommander ? "Remove as commander" : "Make commander"} onClick={() => updateCard(c.uid, { isCommander: !c.isCommander })}>
                      {c.isCommander ? "★" : "☆"}
                    </Tiny>
                    <Tiny title="One less" onClick={() => (c.qty > 1 ? updateCard(c.uid, { qty: c.qty - 1 }) : update({ cards: deck.cards.filter((x) => x.uid !== c.uid) }))}>
                      −
                    </Tiny>
                    <Tiny title="One more" onClick={() => updateCard(c.uid, { qty: c.qty + 1 })}>
                      +
                    </Tiny>
                    <Tiny title="Change image" onClick={() => setProxyFor(c)}>
                      Art
                    </Tiny>
                    <Tiny title="Remove" onClick={() => update({ cards: deck.cards.filter((x) => x.uid !== c.uid) })}>
                      ✕
                    </Tiny>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <aside className="hidden xl:block">
        {hovered && (
          <div className="sticky top-5 flex flex-col gap-3">
            <CardView card={deck.cards.find((c) => c.uid === hovered.uid) ?? hovered} width={300} />
            <CardText card={hovered} />
          </div>
        )}
      </aside>

      {proxyFor && (
        <ProxyDialog
          card={proxyFor}
          onClose={() => setProxyFor(null)}
          onSave={(patch) => {
            updateCard(proxyFor.uid, patch);
            setProxyFor(null);
          }}
        />
      )}
    </main>
  );
}

export function CardText({ card }: { card: DeckCard }) {
  return (
    <div className="rounded-lg bg-neutral-900 p-3 text-sm text-neutral-200">
      <div className="flex justify-between gap-2 font-semibold text-white">
        <span>{card.name}</span>
        <span>
          <ManaText text={card.manaCost} />
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-400">{card.typeLine}</p>
      <p className="mt-2 whitespace-pre-line">
        <ManaText text={card.oracleText} />
      </p>
    </div>
  );
}

function Tiny({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} className="min-w-6 rounded bg-neutral-700 px-1.5 py-0.5 text-xs text-white hover:bg-amber-500 hover:text-black">
      {children}
    </button>
  );
}

/** Adds cards, bumping the quantity when the same card is already in the deck. */
function mergeCards(existing: DeckCard[], added: DeckCard[]): DeckCard[] {
  const out = [...existing];
  for (const a of added) {
    const i = out.findIndex((c) => c.name === a.name && c.source === a.source && !c.proxyImage);
    if (i >= 0) out[i] = { ...out[i], qty: out[i].qty + a.qty, isCommander: out[i].isCommander || a.isCommander };
    else out.push(a);
  }
  return out;
}
