"use client";

import { toPng } from "html-to-image";
import { useRef, useState } from "react";
import { CardFace } from "@/components/CardFace";
import { readImageFile } from "@/lib/images";
import { useLibrary } from "@/lib/store";
import type { Color, CustomCard, Rarity } from "@/lib/types";
import { blankCustomCard, COLORS, newId } from "@/lib/types";

const CARD_TYPES = [
  "Creature",
  "Instant",
  "Sorcery",
  "Artifact",
  "Artifact Creature",
  "Enchantment",
  "Enchantment Creature",
  "Planeswalker",
  "Land",
  "Battle",
];
const SUPERTYPES = ["", "Legendary", "Basic", "Snow", "Legendary Snow", "World"];
const RARITIES: Rarity[] = ["common", "uncommon", "rare", "mythic"];
const COLOR_NAME: Record<Color, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };
const SYMBOLS = ["{W}", "{U}", "{B}", "{R}", "{G}", "{C}", "{X}", "{1}", "{2}", "{3}", "{T}"];

export function CardCreator() {
  const { hydrated, customCards, saveCustomCard, deleteCustomCard } = useLibrary();
  const [draft, setDraft] = useState<CustomCard>(blankCustomCard);
  const [status, setStatus] = useState("");
  const mode = draft.fullImage !== undefined ? "full" : "frame";
  const previewRef = useRef<HTMLDivElement>(null);
  const rulesRef = useRef<HTMLTextAreaElement>(null);
  const saved = customCards.find((c) => c.id === draft.id);
  const dirty = !saved || JSON.stringify({ ...saved, updatedAt: 0 }) !== JSON.stringify({ ...draft, updatedAt: 0 });

  const set = <K extends keyof CustomCard>(key: K, value: CustomCard[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const toggleColor = (c: Color) =>
    set("colors", draft.colors.includes(c) ? draft.colors.filter((x) => x !== c) : COLORS.filter((x) => x === c || draft.colors.includes(x)));

  const insertSymbol = (sym: string) => {
    const el = rulesRef.current;
    const pos = el?.selectionStart ?? draft.rulesText.length;
    set("rulesText", draft.rulesText.slice(0, pos) + sym + draft.rulesText.slice(el?.selectionEnd ?? pos));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos + sym.length, pos + sym.length);
    });
  };

  const onArt = async (file?: File) => {
    if (!file) return;
    try {
      const art = await readImageFile(file);
      setDraft((d) => ({ ...d, art, artX: 50, artY: 50, artZoom: 1 }));
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  const onFullImage = async (file?: File) => {
    if (!file) return;
    try {
      // Keep PNGs lossless at roughly print resolution.
      set("fullImage", await readImageFile(file, 1040, 1, file.type === "image/png" ? "image/png" : "image/jpeg"));
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  const missing = [
    !draft.name.trim() && "name",
    !draft.cardType.trim() && "card type",
    mode === "full" && !draft.fullImage && "card image",
  ].filter(Boolean) as string[];

  const save = () => {
    saveCustomCard(draft);
    setStatus("Saved to your library.");
  };

  const download = async () => {
    if (!previewRef.current) return;
    const url = await toPng(previewRef.current, { pixelRatio: 2.5 });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.name || "card"}.png`;
    a.click();
  };

  return (
    <main className="grid flex-1 gap-6 p-5 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
      <aside className="flex flex-col gap-2">
        <button className="btn-primary" onClick={() => (setDraft(blankCustomCard()), setStatus(""))}>
          New card
        </button>
        <p className="label mt-3">Your cards</p>
        {!hydrated && <p className="text-sm text-neutral-500">Loading…</p>}
        {hydrated && customCards.length === 0 && <p className="text-sm text-neutral-500">Nothing yet.</p>}
        <ul className="flex flex-col gap-1">
          {customCards.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => (setDraft(c), setStatus(""))}
                className={`w-full truncate rounded px-2 py-1 text-left text-sm ${c.id === draft.id ? "bg-white/10 text-white" : "text-neutral-300 hover:bg-white/5"}`}
              >
                {c.name || "Untitled"}
                {c.isToken && <span className="ml-1 text-xs text-neutral-500">token</span>}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="grid content-start gap-4 sm:grid-cols-2">
        <Field label="Card image" wide>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => set("fullImage", undefined)}
              className={`rounded-md border px-3 py-1.5 text-sm ${mode === "frame" ? "border-amber-400 bg-amber-400/15 text-white" : "border-white/10 text-neutral-400"}`}
            >
              Upload art, we draw the card
            </button>
            <button
              onClick={() => mode === "frame" && set("fullImage", "")}
              className={`rounded-md border px-3 py-1.5 text-sm ${mode === "full" ? "border-amber-400 bg-amber-400/15 text-white" : "border-white/10 text-neutral-400"}`}
            >
              Upload a finished card image
            </button>
          </div>
          {mode === "full" && (
            <div className="mt-3">
              <input
                type="file"
                accept="image/*"
                className="text-sm text-neutral-300 file:btn file:mr-3 file:border-0"
                onChange={(e) => onFullImage(e.target.files?.[0])}
              />
              <p className="mt-2 text-xs text-neutral-500">
                Still fill in the card info below. It&apos;s what players read on hover and what the deck checks use.
              </p>
            </div>
          )}
        </Field>

        <Field label="Name">
          <input className="input" value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Grand Arbiter of Proxies" />
        </Field>
        <Field label="Mana cost">
          <input className="input font-mono" value={draft.manaCost} onChange={(e) => set("manaCost", e.target.value)} placeholder="{2}{W}{U}" />
        </Field>
        <Field label="Supertype">
          <select className="input" value={draft.supertypes} onChange={(e) => set("supertypes", e.target.value)}>
            {SUPERTYPES.map((s) => (
              <option key={s} value={s}>
                {s || "None"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Card type">
          <input className="input" list="card-types" value={draft.cardType} onChange={(e) => set("cardType", e.target.value)} />
          <datalist id="card-types">
            {CARD_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
        <Field label="Subtypes">
          <input className="input" value={draft.subtypes} onChange={(e) => set("subtypes", e.target.value)} placeholder="Human Wizard" />
        </Field>
        <Field label="Rarity">
          <select className="input" value={draft.rarity} onChange={(e) => set("rarity", e.target.value as Rarity)}>
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {r[0].toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Color" wide>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => toggleColor(c)}
                className={`rounded-full border px-3 py-1 text-sm ${draft.colors.includes(c) ? "border-amber-400 bg-amber-400/15 text-white" : "border-white/10 text-neutral-400"}`}
              >
                {COLOR_NAME[c]}
              </button>
            ))}
            <span className="self-center text-xs text-neutral-500">None picked means colorless.</span>
          </div>
        </Field>

        <Field label="Rules text" wide>
          <div className="mb-1.5 flex flex-wrap gap-1">
            {SYMBOLS.map((s) => (
              <button key={s} className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-xs text-neutral-300 hover:bg-neutral-700" onClick={() => insertSymbol(s)}>
                {s}
              </button>
            ))}
          </div>
          <textarea
            ref={rulesRef}
            className="input min-h-28"
            value={draft.rulesText}
            onChange={(e) => set("rulesText", e.target.value)}
            placeholder={"Flying\n{T}: Draw a card. (Text in parentheses shows as reminder text.)"}
          />
        </Field>
        <Field label="Flavor text" wide>
          <textarea className="input min-h-14" value={draft.flavorText} onChange={(e) => set("flavorText", e.target.value)} />
        </Field>

        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          <Field label="Power">
            <input className="input" value={draft.power} onChange={(e) => set("power", e.target.value)} />
          </Field>
          <Field label="Toughness">
            <input className="input" value={draft.toughness} onChange={(e) => set("toughness", e.target.value)} />
          </Field>
          <Field label="Loyalty">
            <input className="input" value={draft.loyalty} onChange={(e) => set("loyalty", e.target.value)} />
          </Field>
        </div>

        {mode === "frame" && (
          <Field label="Art" wide>
            <input type="file" accept="image/*" className="text-sm text-neutral-300 file:btn file:mr-3 file:border-0" onChange={(e) => onArt(e.target.files?.[0])} />
            {draft.art && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Slider label="Zoom" min={1} max={3} step={0.05} value={draft.artZoom} onChange={(v) => set("artZoom", v)} />
                <Slider label="Left / right" min={0} max={100} step={1} value={draft.artX} onChange={(v) => set("artX", v)} />
                <Slider label="Up / down" min={0} max={100} step={1} value={draft.artY} onChange={(v) => set("artY", v)} />
              </div>
            )}
          </Field>
        )}
        <Field label="Artist">
          <input className="input" value={draft.artist} onChange={(e) => set("artist", e.target.value)} />
        </Field>
        <Field label="Token">
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" checked={!!draft.isToken} onChange={(e) => set("isToken", e.target.checked)} />
            This is a token
          </label>
        </Field>
      </section>

      <aside className="flex flex-col items-center gap-3">
        <CardFace ref={previewRef} card={draft} width={330} />
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn-primary" onClick={save} disabled={missing.length > 0 || !dirty}>
            {saved ? "Save changes" : "Save card"}
          </button>
          <button className="btn" onClick={download}>
            Download PNG
          </button>
          {saved && (
            <>
              <button className="btn" onClick={() => setDraft({ ...draft, id: newId(), name: `${draft.name} copy` })}>
                Duplicate
              </button>
              <button
                className="btn"
                onClick={() => {
                  if (!confirm(`Delete ${draft.name}?`)) return;
                  deleteCustomCard(draft.id);
                  setDraft(blankCustomCard());
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
        {missing.length > 0 && <p className="text-sm text-neutral-500">Still needed: {missing.join(", ")}.</p>}
        {status && <p className="text-sm text-neutral-400">{status}</p>}
      </aside>
    </main>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}

function Slider(props: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="text-xs text-neutral-400">
      {props.label}
      <input
        type="range"
        className="w-full accent-amber-400"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}
