import type { DeckCard } from "@/lib/types";
import { newId } from "@/lib/types";

export type Zone = "library" | "hand" | "battlefield" | "graveyard" | "exile" | "command";
export const ZONES: Zone[] = ["library", "hand", "battlefield", "graveyard", "exile", "command"];

export interface Instance {
  iid: string;
  card: DeckCard;
  tapped: boolean;
  faceDown: boolean;
  flipped: boolean;
  counters: number;
  x: number;
  y: number;
  isToken: boolean;
}

export interface GameState {
  byId: Record<string, Instance>;
  /** Card ids per zone. Library index 0 is the top card. */
  zones: Record<Zone, string[]>;
  life: number;
  turn: number;
  /** Times each commander has been cast, for commander tax. */
  casts: Record<string, number>;
  log: string[];
}

export type Action =
  | { type: "move"; iid: string; to: Zone; x?: number; y?: number; bottom?: boolean }
  | { type: "draw"; n: number }
  | { type: "shuffle" }
  | { type: "tap"; iid: string }
  | { type: "untapAll" }
  | { type: "counter"; iid: string; delta: number }
  | { type: "flip"; iid: string }
  | { type: "faceDown"; iid: string }
  | { type: "life"; delta: number }
  | { type: "nextTurn" }
  | { type: "mulligan" }
  | { type: "token"; card: DeckCard }
  | { type: "reset"; deck: DeckCard[] };

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function instance(card: DeckCard, isToken = false): Instance {
  return { iid: newId(), card, tapped: false, faceDown: false, flipped: false, counters: 0, x: 0, y: 0, isToken };
}

export function newGame(deck: DeckCard[]): GameState {
  const byId: Record<string, Instance> = {};
  const zones: Record<Zone, string[]> = { library: [], hand: [], battlefield: [], graveyard: [], exile: [], command: [] };
  for (const card of deck) {
    for (let i = 0; i < card.qty; i++) {
      const inst = instance(card);
      byId[inst.iid] = inst;
      zones[card.isCommander ? "command" : "library"].push(inst.iid);
    }
  }
  zones.library = shuffled(zones.library);
  zones.hand = zones.library.splice(0, 7);
  return { byId, zones, life: 40, turn: 1, casts: {}, log: ["Game started. Drew 7."] };
}

/** Next open spot on the battlefield for cards played without dragging. */
function nextSpot(state: GameState) {
  const n = state.zones.battlefield.length;
  return { x: 16 + (n % 9) * 124, y: 16 + Math.floor(n / 9) * 170 };
}

function zoneOf(state: GameState, iid: string): Zone | undefined {
  return ZONES.find((z) => state.zones[z].includes(iid));
}

const log = (state: GameState, line: string) => ({ ...state, log: [line, ...state.log].slice(0, 50) });

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "move": {
      const from = zoneOf(state, action.iid);
      const inst = state.byId[action.iid];
      if (!from || !inst) return state;
      const zones = { ...state.zones, [from]: state.zones[from].filter((i) => i !== action.iid) };
      const byId = { ...state.byId };
      // Tokens stop existing when they leave the battlefield.
      if (inst.isToken && action.to !== "battlefield") {
        delete byId[action.iid];
        return log({ ...state, zones, byId }, `${inst.card.name} token left the battlefield.`);
      }
      const spot = action.x !== undefined && action.y !== undefined ? { x: action.x, y: action.y } : nextSpot(state);
      const leavingField = from === "battlefield" && action.to !== "battlefield";
      byId[action.iid] = {
        ...inst,
        ...(action.to === "battlefield" ? spot : {}),
        ...(leavingField ? { tapped: false, counters: 0, faceDown: false, flipped: false } : {}),
      };
      if (action.to === "library" && !action.bottom) zones.library = [action.iid, ...zones.library];
      else zones[action.to] = [...zones[action.to], action.iid];
      let casts = state.casts;
      if (from === "command" && action.to === "battlefield") casts = { ...casts, [action.iid]: (casts[action.iid] ?? 0) + 1 };
      const next = { ...state, zones, byId, casts };
      return from === action.to ? next : log(next, `${inst.card.name}: ${from} → ${action.to}${action.bottom ? " (bottom)" : ""}.`);
    }
    case "draw": {
      const drawn = state.zones.library.slice(0, action.n);
      if (!drawn.length) return log(state, "Library is empty.");
      return log(
        { ...state, zones: { ...state.zones, library: state.zones.library.slice(drawn.length), hand: [...state.zones.hand, ...drawn] } },
        `Drew ${drawn.length}.`,
      );
    }
    case "shuffle":
      return log({ ...state, zones: { ...state.zones, library: shuffled(state.zones.library) } }, "Shuffled library.");
    case "tap": {
      const inst = state.byId[action.iid];
      return { ...state, byId: { ...state.byId, [action.iid]: { ...inst, tapped: !inst.tapped } } };
    }
    case "untapAll": {
      const byId = { ...state.byId };
      for (const iid of state.zones.battlefield) byId[iid] = { ...byId[iid], tapped: false };
      return { ...state, byId };
    }
    case "counter": {
      const inst = state.byId[action.iid];
      return { ...state, byId: { ...state.byId, [action.iid]: { ...inst, counters: inst.counters + action.delta } } };
    }
    case "flip": {
      const inst = state.byId[action.iid];
      return { ...state, byId: { ...state.byId, [action.iid]: { ...inst, flipped: !inst.flipped } } };
    }
    case "faceDown": {
      const inst = state.byId[action.iid];
      return { ...state, byId: { ...state.byId, [action.iid]: { ...inst, faceDown: !inst.faceDown } } };
    }
    case "life":
      return { ...state, life: state.life + action.delta };
    case "nextTurn": {
      const untapped = reducer(state, { type: "untapAll" });
      return reducer(log({ ...untapped, turn: state.turn + 1 }, `Turn ${state.turn + 1}.`), { type: "draw", n: 1 });
    }
    case "mulligan": {
      const library = shuffled([...state.zones.library, ...state.zones.hand]);
      return log({ ...state, zones: { ...state.zones, library: library.slice(7), hand: library.slice(0, 7) } }, "Mulliganed to a new 7.");
    }
    case "token": {
      const inst = { ...instance(action.card, true), ...nextSpot(state) };
      return log(
        { ...state, byId: { ...state.byId, [inst.iid]: inst }, zones: { ...state.zones, battlefield: [...state.zones.battlefield, inst.iid] } },
        `Created ${action.card.name} token.`,
      );
    }
    case "reset":
      return newGame(action.deck);
  }
}
