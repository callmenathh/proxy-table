"use client";

import { useLibrary } from "@/lib/store";
import type { DeckCard } from "@/lib/types";
import { CARD_H, CARD_W, CardFace } from "./CardFace";

/**
 * Shows any deck card at a given width: the proxy image if one is set,
 * otherwise the custom card render or the official Scryfall image.
 */
export function CardView({ card, width, back = false }: { card: DeckCard; width: number; back?: boolean }) {
  const custom = useLibrary((s) => (card.customId ? s.customCards.find((c) => c.id === card.customId) : undefined));
  const height = (width * CARD_H) / CARD_W;
  const radius = width * 0.047;
  const src = back ? card.backImageUrl : card.proxyImage || card.imageUrl;

  if (!back && !card.proxyImage && custom) return <CardFace card={custom} width={width} />;
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={card.name} draggable={false} style={{ width, height, borderRadius: radius, objectFit: "cover", display: "block" }} />;
  return (
    <div
      style={{ width, height, borderRadius: radius, fontSize: Math.max(9, width / 14) }}
      className="flex flex-col items-center justify-center gap-1 border-2 border-neutral-500 bg-neutral-700 p-2 text-center text-neutral-100"
    >
      <span className="font-semibold">{card.name}</span>
      <span style={{ fontSize: "0.8em" }} className="text-neutral-300">
        {card.typeLine}
      </span>
      {card.oracleText.length < 40 && <span className="font-bold">{card.oracleText}</span>}
    </div>
  );
}

export function CardBack({ width }: { width: number }) {
  return (
    <div
      style={{ width, height: (width * CARD_H) / CARD_W, borderRadius: width * 0.047 }}
      className="card-back flex items-center justify-center"
    >
      <span style={{ fontSize: width / 7 }} className="font-serif font-bold text-amber-200/80">
        PT
      </span>
    </div>
  );
}
