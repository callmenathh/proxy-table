"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { CardBack, CardView } from "@/components/CardView";
import { CardText } from "@/app/decks/[id]/DeckEditor";
import { useLibrary } from "@/lib/store";
import type { DeckCard } from "@/lib/types";
import { customToDeckCard, newId } from "@/lib/types";
import type { Action, GameState, Instance, Zone } from "./game";
import { newGame, reducer } from "./game";

const FIELD_W = 108;
const HAND_W = 118;
const PILE_W = 92;

const widthFor = (z: Zone) => (z === "hand" ? HAND_W : z === "battlefield" ? FIELD_W : PILE_W);

type Drag = { iid: string; from: Zone; dx: number; dy: number; x: number; y: number; startX: number; startY: number; moved: boolean };
type Menu = { iid: string; x: number; y: number };

function gameReducer(state: GameState | null, action: Action): GameState | null {
  if (action.type === "reset") return newGame(action.deck);
  return state ? reducer(state, action) : state;
}

export function SoloTable() {
  const { id } = useParams<{ id: string }>();
  const { hydrated, decks, customCards } = useLibrary();
  const deck = decks.find((d) => d.id === id);
  const [game, dispatch] = useReducer(gameReducer, null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Zone | null>(null);
  const [tokenOpen, setTokenOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (deck && !game) dispatch({ type: "reset", deck: deck.cards });
  }, [deck, game]);

  const onPointerDown = (e: React.PointerEvent, inst: Instance, from: Zone) => {
    if (e.button !== 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu(null);
    setDrag({ iid: inst.iid, from, dx: e.clientX - rect.left, dy: e.clientY - rect.top, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false });
  };

  const finishDrag = useCallback(
    (e: PointerEvent) => {
      if (!drag) return;
      setDrag(null);
      if (!drag.moved) {
        if (drag.from === "battlefield") dispatch({ type: "tap", iid: drag.iid });
        return;
      }
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-zone]");
      const to = target?.dataset.zone as Zone | undefined;
      if (!to) return;
      if (to === "battlefield" && fieldRef.current) {
        const el = fieldRef.current;
        const r = el.getBoundingClientRect();
        // Keep the grab point under the cursor, scaled to the battlefield card size.
        const k = FIELD_W / widthFor(drag.from);
        dispatch({
          type: "move",
          iid: drag.iid,
          to,
          x: Math.max(0, e.clientX - r.left + el.scrollLeft - drag.dx * k),
          y: Math.max(0, e.clientY - r.top + el.scrollTop - drag.dy * k),
        });
      } else if (to !== drag.from) {
        dispatch({ type: "move", iid: drag.iid, to });
      }
    },
    [drag],
  );

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) =>
      setDrag((d) => d && { ...d, x: e.clientX, y: e.clientY, moved: d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5 });
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finishDrag);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finishDrag);
    };
  }, [drag, finishDrag]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      const k = e.key.toLowerCase();
      if (k === "d") dispatch({ type: "draw", n: 1 });
      else if (k === "u") dispatch({ type: "untapAll" });
      else if (k === "s") dispatch({ type: "shuffle" });
      else if (k === "n") dispatch({ type: "nextTurn" });
      else if (k === "t" && hovered) dispatch({ type: "tap", iid: hovered });
      else if (k === "escape") {
        setMenu(null);
        setViewing(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hovered]);

  if (!hydrated) return <p className="p-6 text-neutral-500">Loading…</p>;
  if (!deck)
    return (
      <p className="p-6 text-neutral-400">
        Deck not found. <Link href="/decks" className="text-amber-300 underline">Back to decks</Link>
      </p>
    );
  if (!game) return null;

  const cardProps = (inst: Instance, zone: Zone) => ({
    onPointerDown: (e: React.PointerEvent) => onPointerDown(e, inst, zone),
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      setMenu({ iid: inst.iid, x: e.clientX, y: e.clientY });
    },
    onMouseEnter: () => setHovered(inst.iid),
    onMouseLeave: () => setHovered((h) => (h === inst.iid ? null : h)),
    style: { opacity: drag?.moved && drag.iid === inst.iid ? 0.3 : 1 },
  });

  const hoveredInst = hovered ? game.byId[hovered] : undefined;
  const dragInst = drag?.moved ? game.byId[drag.iid] : undefined;
  const zoneCards = (z: Zone) => game.zones[z].map((i) => game.byId[i]);

  return (
    <main className="flex h-[calc(100vh-53px)] select-none flex-col overflow-hidden bg-[#1d2a22]" onClick={() => setMenu(null)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-black/40 bg-black/30 px-4 py-2 text-sm">
        <span className="mr-2 font-semibold text-white">{deck.name}</span>
        <span className="text-neutral-300">Turn {game.turn}</span>
        <div className="mx-3 flex items-center gap-1">
          <button className="btn" onClick={() => dispatch({ type: "life", delta: -1 })}>
            −
          </button>
          <span className="w-12 text-center text-xl font-bold text-white" title="Life">
            {game.life}
          </span>
          <button className="btn" onClick={() => dispatch({ type: "life", delta: 1 })}>
            +
          </button>
        </div>
        <button className="btn-primary" onClick={() => dispatch({ type: "nextTurn" })} title="Untap and draw (N)">
          Next turn
        </button>
        <button className="btn" onClick={() => dispatch({ type: "draw", n: 1 })} title="D">
          Draw
        </button>
        <button className="btn" onClick={() => dispatch({ type: "untapAll" })} title="U">
          Untap all
        </button>
        <button className="btn" onClick={() => dispatch({ type: "shuffle" })} title="S">
          Shuffle
        </button>
        <button className="btn" onClick={() => dispatch({ type: "mulligan" })}>
          Mulligan
        </button>
        <button className="btn" onClick={() => setTokenOpen(true)}>
          Token
        </button>
        <button className="btn" onClick={() => confirm("Start a new game?") && dispatch({ type: "reset", deck: deck.cards })}>
          Restart
        </button>
        <Link href={`/decks/${deck.id}`} className="ml-auto text-neutral-400 hover:text-white">
          Edit deck
        </Link>
      </div>

      <div className="flex min-h-0 flex-1">
        <div ref={fieldRef} data-zone="battlefield" className="relative min-w-0 flex-1 overflow-auto">
          {game.zones.battlefield.length === 0 && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-neutral-500">
              Drag cards here. Click to tap, right-click for more.
            </p>
          )}
          {zoneCards("battlefield").map((inst) => (
            <div
              key={inst.iid}
              className="absolute cursor-grab transition-transform"
              {...cardProps(inst, "battlefield")}
              style={{ ...cardProps(inst, "battlefield").style, left: inst.x, top: inst.y, transform: inst.tapped ? "rotate(90deg)" : undefined }}
            >
              <TableCard inst={inst} width={FIELD_W} />
            </div>
          ))}
        </div>

        <aside className="flex w-[220px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-black/40 bg-black/20 p-3">
          <Pile label="Command" zone="command" cards={zoneCards("command")} cardProps={cardProps} onOpen={setViewing} extra={commanderTax(game)} />
          <div data-zone="library">
            <p className="label">Library ({game.zones.library.length})</p>
            <div className="flex gap-2">
              <button title="Click to draw" onClick={() => dispatch({ type: "draw", n: 1 })}>
                {game.zones.library.length ? <CardBack width={PILE_W} /> : <Empty />}
              </button>
              <div className="flex flex-col gap-1">
                <button className="btn text-xs" onClick={() => setViewing("library")}>
                  Search
                </button>
                <button className="btn text-xs" onClick={() => dispatch({ type: "shuffle" })}>
                  Shuffle
                </button>
              </div>
            </div>
          </div>
          <Pile label="Graveyard" zone="graveyard" cards={zoneCards("graveyard")} cardProps={cardProps} onOpen={setViewing} />
          <Pile label="Exile" zone="exile" cards={zoneCards("exile")} cardProps={cardProps} onOpen={setViewing} />
        </aside>
      </div>

      <div data-zone="hand" className="flex min-h-[176px] shrink-0 items-end gap-2 overflow-x-auto border-t border-black/40 bg-black/40 px-4 py-2">
        <span className="label self-start">Hand ({game.zones.hand.length})</span>
        {zoneCards("hand").map((inst) => (
          <div
            key={inst.iid}
            className="shrink-0 cursor-grab transition-transform hover:-translate-y-2"
            {...cardProps(inst, "hand")}
            onDoubleClick={() => dispatch({ type: "move", iid: inst.iid, to: "battlefield" })}
          >
            <TableCard inst={inst} width={HAND_W} />
          </div>
        ))}
      </div>

      {hoveredInst && !drag && !menu && !hoveredInst.faceDown && (
        <div className="pointer-events-none fixed bottom-48 right-[236px] z-30 flex w-[260px] flex-col gap-2">
          <CardView card={hoveredInst.card} width={260} back={hoveredInst.flipped && !!hoveredInst.card.backImageUrl} />
          <CardText card={hoveredInst.card} />
        </div>
      )}

      {dragInst && drag && (
        <div className="pointer-events-none fixed z-50" style={{ left: drag.x - drag.dx, top: drag.y - drag.dy }}>
          <TableCard inst={dragInst} width={widthFor(drag.from)} />
        </div>
      )}

      {menu && game.byId[menu.iid] && <CardMenu menu={menu} game={game} dispatch={dispatch} close={() => setMenu(null)} />}

      {viewing && (
        <ZoneViewer
          zone={viewing}
          cards={zoneCards(viewing)}
          onClose={() => setViewing(null)}
          onMenu={(iid, x, y) => setMenu({ iid, x, y })}
        />
      )}

      {tokenOpen && (
        <TokenDialog
          tokens={customCards.filter((c) => c.isToken).map((c) => customToDeckCard(c))}
          onClose={() => setTokenOpen(false)}
          onCreate={(card) => {
            dispatch({ type: "token", card });
            setTokenOpen(false);
          }}
        />
      )}
    </main>
  );
}

function commanderTax(game: GameState) {
  const taxes = Object.entries(game.casts).filter(([, n]) => n > 0);
  if (!taxes.length) return null;
  return taxes.map(([iid, n]) => (
    <p key={iid} className="text-xs text-neutral-400">
      {game.byId[iid]?.card.name}: tax {"{"}
      {n * 2}
      {"}"}
    </p>
  ));
}

function TableCard({ inst, width }: { inst: Instance; width: number }) {
  return (
    <div className="relative">
      {inst.faceDown ? <CardBack width={width} /> : <CardView card={inst.card} width={width} back={inst.flipped && !!inst.card.backImageUrl} />}
      {inst.counters !== 0 && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/85 px-2 py-0.5 text-sm font-bold text-amber-300 ring-1 ring-amber-300">
          {inst.counters > 0 ? `+${inst.counters}` : inst.counters}
        </span>
      )}
      {inst.isToken && <span className="absolute bottom-1 left-1 rounded bg-black/80 px-1 text-[10px] text-white">TOKEN</span>}
    </div>
  );
}

type CardProps = (inst: Instance, zone: Zone) => React.HTMLAttributes<HTMLDivElement>;

function Pile(props: { label: string; zone: Zone; cards: Instance[]; cardProps: CardProps; onOpen: (z: Zone) => void; extra?: React.ReactNode }) {
  const top = props.cards[props.cards.length - 1];
  return (
    <div data-zone={props.zone}>
      <div className="flex items-baseline justify-between">
        <p className="label">
          {props.label} ({props.cards.length})
        </p>
        {props.cards.length > 1 && (
          <button className="text-xs text-neutral-400 hover:text-white" onClick={() => props.onOpen(props.zone)}>
            View all
          </button>
        )}
      </div>
      {props.zone === "command" ? (
        <div className="flex flex-wrap gap-2">
          {props.cards.map((inst) => (
            <div key={inst.iid} className="cursor-grab" {...props.cardProps(inst, props.zone)}>
              <TableCard inst={inst} width={PILE_W} />
            </div>
          ))}
          {!props.cards.length && <Empty />}
        </div>
      ) : top ? (
        <div className="w-fit cursor-grab" {...props.cardProps(top, props.zone)}>
          <TableCard inst={top} width={PILE_W} />
        </div>
      ) : (
        <Empty />
      )}
      {props.extra}
    </div>
  );
}

function Empty() {
  return <div style={{ width: PILE_W, height: PILE_W * 1.4 }} className="rounded-md border border-dashed border-white/15" />;
}

const MOVES: { to: Zone; label: string; bottom?: boolean }[] = [
  { to: "hand", label: "To hand" },
  { to: "battlefield", label: "To battlefield" },
  { to: "graveyard", label: "To graveyard" },
  { to: "exile", label: "To exile" },
  { to: "library", label: "To top of library" },
  { to: "library", label: "To bottom of library", bottom: true },
  { to: "command", label: "To command zone" },
];

function CardMenu({ menu, game, dispatch, close }: { menu: Menu; game: GameState; dispatch: (a: Action) => void; close: () => void }) {
  const inst = game.byId[menu.iid];
  const onField = game.zones.battlefield.includes(menu.iid);
  const run = (a: Action) => (dispatch(a), close());
  const item = "block w-full rounded px-3 py-1 text-left text-sm text-neutral-200 hover:bg-amber-500 hover:text-black";
  return (
    <div
      className="fixed z-[60] w-52 rounded-lg border border-white/10 bg-neutral-900 p-1 shadow-xl"
      style={{ left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y, window.innerHeight - 360) }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="truncate px-3 py-1 text-xs text-neutral-500">{inst.card.name}</p>
      {onField && (
        <>
          <button className={item} onClick={() => run({ type: "tap", iid: inst.iid })}>
            {inst.tapped ? "Untap" : "Tap"}
          </button>
          <button className={item} onClick={() => run({ type: "counter", iid: inst.iid, delta: 1 })}>
            Add counter
          </button>
          <button className={item} onClick={() => run({ type: "counter", iid: inst.iid, delta: -1 })}>
            Remove counter
          </button>
          <button className={item} onClick={() => run({ type: "faceDown", iid: inst.iid })}>
            {inst.faceDown ? "Turn face up" : "Turn face down"}
          </button>
          {inst.card.backImageUrl && (
            <button className={item} onClick={() => run({ type: "flip", iid: inst.iid })}>
              Transform
            </button>
          )}
          <button
            className={item}
            onClick={() => run({ type: "token", card: { ...inst.card, uid: newId() } })}
            title="Make a token copy"
          >
            Create token copy
          </button>
          <hr className="my-1 border-white/10" />
        </>
      )}
      {MOVES.map((m) => (
        <button key={m.label} className={item} onClick={() => run({ type: "move", iid: inst.iid, to: m.to, bottom: m.bottom })}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

function ZoneViewer(props: { zone: Zone; cards: Instance[]; onClose: () => void; onMenu: (iid: string, x: number, y: number) => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6" onClick={props.onClose}>
      <div className="max-h-[85vh] w-full max-w-5xl overflow-auto rounded-xl bg-neutral-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex justify-between">
          <h2 className="font-semibold capitalize text-white">
            {props.zone} ({props.cards.length})
          </h2>
          <button className="text-neutral-400 hover:text-white" onClick={props.onClose}>
            ✕
          </button>
        </div>
        <p className="mb-3 text-sm text-neutral-400">Click a card to move it.</p>
        <div className="flex flex-wrap gap-2">
          {props.cards.map((inst) => (
            <button
              key={inst.iid}
              onClick={(e) => {
                e.stopPropagation();
                props.onMenu(inst.iid, e.clientX, e.clientY);
              }}
            >
              <CardView card={inst.card} width={110} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TokenDialog({ tokens, onClose, onCreate }: { tokens: DeckCard[]; onClose: () => void; onCreate: (c: DeckCard) => void }) {
  const [name, setName] = useState("Soldier");
  const [pt, setPt] = useState("1/1");
  const quick = (): DeckCard => ({
    uid: newId(),
    qty: 1,
    name,
    source: "scryfall",
    typeLine: "Token Creature",
    manaCost: "",
    oracleText: pt,
    colorIdentity: [],
    isCommander: false,
  });
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-neutral-900 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 font-semibold text-white">Create a token</h2>
        <div className="flex gap-2">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <input className="input w-24" value={pt} onChange={(e) => setPt(e.target.value)} placeholder="1/1" />
          <button className="btn-primary shrink-0" onClick={() => onCreate(quick())}>
            Create
          </button>
        </div>
        <p className="label mt-5">Your tokens from the creator</p>
        {tokens.length === 0 && <p className="text-sm text-neutral-500">Tick &quot;This is a token&quot; in the creator to see them here.</p>}
        <div className="flex flex-wrap gap-2">
          {tokens.map((t) => (
            <button key={t.uid} onClick={() => onCreate(t)}>
              <CardView card={t} width={90} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
