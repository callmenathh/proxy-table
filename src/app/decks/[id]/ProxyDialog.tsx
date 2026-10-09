"use client";

import { useEffect, useState } from "react";
import { CardView } from "@/components/CardView";
import { readImageFile } from "@/lib/images";
import type { ScryfallCard } from "@/lib/scryfall";
import { printings, scryfallToDeckCard } from "@/lib/scryfall";
import type { DeckCard } from "@/lib/types";

interface Props {
  card: DeckCard;
  onClose: () => void;
  onSave: (patch: Partial<DeckCard>) => void;
}

/** Pick a proxy image for a card: upload, link, or another official printing. */
export function ProxyDialog({ card, onClose, onSave }: Props) {
  const [proxy, setProxy] = useState(card.proxyImage ?? "");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [prints, setPrints] = useState<ScryfallCard[] | null>(null);

  useEffect(() => {
    if (card.source === "scryfall") printings(card.name).then(setPrints);
  }, [card]);

  const preview: DeckCard = { ...card, proxyImage: proxy || undefined };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-neutral-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-white">Image for {card.name}</h2>
          <button className="text-neutral-400 hover:text-white" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-[220px_1fr]">
          <CardView card={preview} width={220} />
          <div className="flex flex-col gap-4">
            <div>
              <span className="label">Upload a proxy image</span>
              <input
                type="file"
                accept="image/*"
                className="text-sm text-neutral-300 file:btn file:mr-3 file:border-0"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    setProxy(await readImageFile(f, 900));
                    setError("");
                  } catch (err) {
                    setError((err as Error).message);
                  }
                }}
              />
            </div>
            <div>
              <span className="label">Or paste an image link</span>
              <div className="flex gap-2">
                <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
                <button className="btn shrink-0" disabled={!/^https?:\/\//.test(url)} onClick={() => setProxy(url)}>
                  Use
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-primary" onClick={() => onSave({ proxyImage: proxy || undefined })}>
                Save
              </button>
              {card.proxyImage && (
                <button className="btn" onClick={() => onSave({ proxyImage: undefined })}>
                  Remove proxy
                </button>
              )}
            </div>
          </div>
        </div>
        {card.source === "scryfall" && (
          <div className="mt-6">
            <span className="label">Or pick another official printing</span>
            {!prints && <p className="text-sm text-neutral-500">Loading printings…</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {prints?.map((p) => {
                const dc = scryfallToDeckCard(p, card.qty, card.isCommander);
                return (
                  <button
                    key={p.id}
                    title={`${p.set.toUpperCase()} ${p.collector_number}`}
                    className={`rounded-md ring-2 ${p.id === card.scryfallId ? "ring-amber-400" : "ring-transparent hover:ring-white/40"}`}
                    onClick={() =>
                      onSave({ scryfallId: p.id, imageUrl: dc.imageUrl, backImageUrl: dc.backImageUrl, proxyImage: undefined })
                    }
                  >
                    <CardView card={dc} width={100} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
