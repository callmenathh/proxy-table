export type Color = "W" | "U" | "B" | "R" | "G";
export const COLORS: Color[] = ["W", "U", "B", "R", "G"];

export type Rarity = "common" | "uncommon" | "rare" | "mythic";

/** A card made in the creator. */
export interface CustomCard {
  id: string;
  name: string;
  manaCost: string;
  supertypes: string;
  cardType: string;
  subtypes: string;
  rulesText: string;
  flavorText: string;
  power: string;
  toughness: string;
  loyalty: string;
  colors: Color[];
  rarity: Rarity;
  artist: string;
  /** Art as a data URL, shown inside our frame. */
  art?: string;
  /** A finished image of the whole card. When set it is shown instead of our frame. */
  fullImage?: string;
  /** Art position in percent (0-100) and zoom (1 = cover). */
  artX: number;
  artY: number;
  artZoom: number;
  isToken?: boolean;
  /** Set when this card is a proxy of a real card: its rules come from Scryfall. */
  reprintOf?: { scryfallId: string; name: string; colorIdentity: Color[] };
  createdAt: number;
  updatedAt: number;
}

/** One line of a deck: an official card or a custom one. */
export interface DeckCard {
  uid: string;
  qty: number;
  name: string;
  source: "scryfall" | "custom";
  scryfallId?: string;
  customId?: string;
  imageUrl?: string;
  backImageUrl?: string;
  typeLine: string;
  manaCost: string;
  oracleText: string;
  colorIdentity: Color[];
  /** Image that replaces the official art everywhere (data URL or https URL). */
  proxyImage?: string;
  isCommander: boolean;
}

export interface Deck {
  id: string;
  name: string;
  cards: DeckCard[];
  unresolved: string[];
  createdAt: number;
  updatedAt: number;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function customTypeLine(c: Pick<CustomCard, "supertypes" | "cardType" | "subtypes" | "isToken">): string {
  const left = [c.supertypes.trim(), c.isToken ? "Token" : "", c.cardType.trim()].filter(Boolean).join(" ");
  return c.subtypes.trim() ? `${left} — ${c.subtypes.trim()}` : left;
}

/** Colors from the chosen colors plus any colored mana symbols in cost or text. */
export function customColorIdentity(c: Pick<CustomCard, "colors" | "manaCost" | "rulesText" | "reprintOf">): Color[] {
  if (c.reprintOf) return c.reprintOf.colorIdentity;
  const found = new Set<Color>(c.colors);
  for (const m of `${c.manaCost} ${c.rulesText}`.matchAll(/\{([^}]+)\}/g)) {
    for (const ch of m[1].toUpperCase()) if (COLORS.includes(ch as Color)) found.add(ch as Color);
  }
  return COLORS.filter((x) => found.has(x));
}

export function blankCustomCard(): CustomCard {
  const now = Date.now();
  return {
    id: newId(),
    name: "",
    manaCost: "",
    supertypes: "",
    cardType: "Creature",
    subtypes: "",
    rulesText: "",
    flavorText: "",
    power: "",
    toughness: "",
    loyalty: "",
    colors: [],
    rarity: "common",
    artist: "",
    artX: 50,
    artY: 50,
    artZoom: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function customToDeckCard(c: CustomCard, qty = 1): DeckCard {
  return {
    uid: newId(),
    qty,
    name: c.name || "Untitled",
    source: "custom",
    customId: c.id,
    typeLine: customTypeLine(c),
    manaCost: c.manaCost,
    oracleText: c.rulesText,
    colorIdentity: customColorIdentity(c),
    isCommander: false,
  };
}
