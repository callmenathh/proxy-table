import type { DecklistLine } from "./decklist";
import type { Color, DeckCard } from "./types";
import { newId } from "./types";

interface ScryfallFace {
  name: string;
  colors?: Color[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  flavor_text?: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  image_uris?: { normal: string; large: string };
}

export interface ScryfallCard extends ScryfallFace {
  id: string;
  set: string;
  collector_number: string;
  color_identity: Color[];
  rarity: string;
  card_faces?: ScryfallFace[];
}

const API = "https://api.scryfall.com";
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function scryfallToDeckCard(card: ScryfallCard, qty: number, isCommander: boolean): DeckCard {
  const faces = card.card_faces ?? [];
  const front = card.image_uris ?? faces[0]?.image_uris;
  const back = card.image_uris ? undefined : faces[1]?.image_uris;
  const oracleText =
    card.oracle_text ?? faces.map((f) => `${f.name}\n${f.oracle_text ?? ""}`.trim()).join("\n\n—\n\n");
  return {
    uid: newId(),
    qty,
    name: card.name,
    source: "scryfall",
    scryfallId: card.id,
    imageUrl: front?.normal,
    backImageUrl: back?.normal,
    typeLine: card.type_line ?? faces.map((f) => f.type_line).join(" // "),
    manaCost: card.mana_cost ?? faces.map((f) => f.mana_cost).filter(Boolean).join(" // "),
    oracleText,
    colorIdentity: card.color_identity,
    isCommander,
  };
}

/** Looks up decklist lines on Scryfall, 75 at a time, and reports what it couldn't find. */
export async function resolveLines(lines: DecklistLine[]): Promise<{ cards: DeckCard[]; notFound: DecklistLine[] }> {
  const cards: DeckCard[] = [];
  const notFound: DecklistLine[] = [];
  for (let i = 0; i < lines.length; i += 75) {
    const batch = lines.slice(i, i + 75);
    const identifiers = batch.map((l) =>
      l.set && l.collectorNumber ? { set: l.set, collector_number: l.collectorNumber } : { name: l.name },
    );
    const res = await fetch(`${API}/cards/collection`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ identifiers }),
    });
    if (!res.ok) throw new Error(`Scryfall returned ${res.status}`);
    const body: { data: ScryfallCard[] } = await res.json();

    const byPrinting = new Map<string, ScryfallCard>();
    const byName = new Map<string, ScryfallCard>();
    for (const c of body.data) {
      byPrinting.set(`${c.set}/${c.collector_number}`, c);
      byName.set(norm(c.name), c);
      // Let "Delver of Secrets" match "Delver of Secrets // Insectile Aberration".
      byName.set(norm(c.name.split(" // ")[0]), c);
    }
    for (const l of batch) {
      const hit =
        (l.set && l.collectorNumber && byPrinting.get(`${l.set}/${l.collectorNumber}`)) ||
        byName.get(norm(l.name)) ||
        byName.get(norm(l.name.split(/\s*\/\/?\s*/)[0]));
      if (hit) cards.push(scryfallToDeckCard(hit, l.qty, l.isCommander));
      else notFound.push(l);
    }
    // Scryfall asks clients to keep to about 10 requests a second.
    if (i + 75 < lines.length) await new Promise((r) => setTimeout(r, 120));
  }
  return { cards, notFound };
}

export async function autocomplete(q: string): Promise<string[]> {
  if (q.trim().length < 2) return [];
  const res = await fetch(`${API}/cards/autocomplete?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return (await res.json()).data as string[];
}

/** All printings of a card, for the art picker. */
export async function printings(name: string): Promise<ScryfallCard[]> {
  const q = encodeURIComponent(`!"${name}" game:paper`);
  const res = await fetch(`${API}/cards/search?q=${q}&unique=prints&order=released`);
  if (!res.ok) return [];
  return (await res.json()).data as ScryfallCard[];
}

export async function cardByName(name: string): Promise<ScryfallCard | null> {
  const res = await fetch(`${API}/cards/named?exact=${encodeURIComponent(name)}`);
  return res.ok ? res.json() : null;
}
