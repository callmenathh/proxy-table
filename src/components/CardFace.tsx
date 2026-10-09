"use client";

import { forwardRef, useLayoutEffect, useRef } from "react";
import type { Color, CustomCard } from "@/lib/types";
import { customTypeLine, displayName } from "@/lib/types";
import { ManaText } from "./ManaText";

/** Card is designed at 300x419 (63x88mm) and scaled with CSS. */
export const CARD_W = 300;
export const CARD_H = 419;

const FRAME: Record<Color | "multi" | "none" | "land", { frame: string; box: string; accent: string }> = {
  W: { frame: "linear-gradient(160deg,#f3ecd2,#d8ccaa)", box: "#fbf7ea", accent: "#b9a874" },
  U: { frame: "linear-gradient(160deg,#5b8fc4,#2c5b8f)", box: "#e6eef6", accent: "#2c5b8f" },
  B: { frame: "linear-gradient(160deg,#4c4545,#211d1d)", box: "#e5e0dd", accent: "#5b5151" },
  R: { frame: "linear-gradient(160deg,#d8664a,#962c1d)", box: "#f6e6df", accent: "#962c1d" },
  G: { frame: "linear-gradient(160deg,#4f9a5f,#24603a)", box: "#e5efe2", accent: "#24603a" },
  multi: { frame: "linear-gradient(160deg,#e3c46b,#a9812e)", box: "#f7efd8", accent: "#a9812e" },
  none: { frame: "linear-gradient(160deg,#b8bcc2,#7d838b)", box: "#eceef0", accent: "#6b7178" },
  land: { frame: "linear-gradient(160deg,#a88a6a,#6d543b)", box: "#f0e8de", accent: "#6d543b" },
};

const RARITY: Record<CustomCard["rarity"], string> = {
  common: "#1a1a1a",
  uncommon: "linear-gradient(135deg,#b7c4cc,#6d7d86)",
  rare: "linear-gradient(135deg,#e8cf7a,#a98a2c)",
  mythic: "linear-gradient(135deg,#f6a35a,#c4381e)",
};

export function frameFor(card: Pick<CustomCard, "colors" | "cardType">) {
  if (card.colors.length > 1) return FRAME.multi;
  if (card.colors.length === 1) return FRAME[card.colors[0]];
  if (/land/i.test(card.cardType)) return FRAME.land;
  return FRAME.none;
}

/** Shrinks text until it fits its box. */
function useFitText(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let size = 13;
    el.style.fontSize = `${size}px`;
    while (el.scrollHeight > el.clientHeight + 1 && size > 6) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

function RulesText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n+/).map((para, i) => (
        <p key={i} style={{ margin: "0 0 0.35em" }}>
          {para.split(/(\([^)]*\))/g).map((chunk, j) =>
            chunk.startsWith("(") ? (
              <i key={j}>
                <ManaText text={chunk} size="0.9em" />
              </i>
            ) : (
              <ManaText key={j} text={chunk} size="0.9em" />
            ),
          )}
        </p>
      ))}
    </>
  );
}

interface Props {
  card: CustomCard;
  /** Rendered width in px. */
  width?: number;
}

export const CardFace = forwardRef<HTMLDivElement, Props>(function CardFace({ card, width = CARD_W }, ref) {
  const f = frameFor(card);
  const scale = width / CARD_W;
  const textRef = useFitText([card.rulesText, card.flavorText, width]);
  const typeLine = customTypeLine(card) || "Card";
  const isCreature = /creature|vehicle/i.test(card.cardType) || card.power || card.toughness;
  const isWalker = /planeswalker/i.test(card.cardType) || card.loyalty;

  if (card.fullImage)
    return (
      <div ref={ref} style={{ width, height: CARD_H * scale, borderRadius: 14 * scale, overflow: "hidden", flexShrink: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.fullImage} alt={card.name} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    );

  return (
    <div style={{ width, height: CARD_H * scale, overflow: "hidden", borderRadius: 14 * scale, flexShrink: 0 }}>
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: CARD_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: "#141414",
          borderRadius: 14,
          padding: 11,
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "#161616",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            background: f.frame,
            borderRadius: 8,
            height: "100%",
            padding: 7,
            display: "flex",
            flexDirection: "column",
            gap: 5,
            boxSizing: "border-box",
          }}
        >
          <Bar box={f.box}>
            <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {displayName(card) || "Card name"}
            </span>
            <span style={{ display: "flex", gap: 1, flexShrink: 0 }}>
              <ManaText text={card.manaCost} size="15px" />
            </span>
          </Bar>

          <div
            style={{
              height: 165,
              borderRadius: 3,
              border: `2px solid ${f.accent}`,
              background: "repeating-linear-gradient(45deg,#2c2c2c 0 10px,#333 10px 20px)",
              overflow: "hidden",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
          >
            {card.art && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.art}
                alt=""
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: `${card.artX}% ${card.artY}%`,
                  transform: `scale(${card.artZoom})`,
                  transformOrigin: `${card.artX}% ${card.artY}%`,
                  display: "block",
                }}
              />
            )}
          </div>

          <Bar box={f.box}>
            <span style={{ fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {typeLine}
            </span>
            <span
              title={card.rarity}
              style={{
                width: 12,
                height: 12,
                transform: "rotate(45deg)",
                background: RARITY[card.rarity],
                border: "1px solid #111",
                flexShrink: 0,
                marginRight: 2,
              }}
            />
          </Bar>

          <div
            ref={textRef}
            style={{
              flex: 1,
              background: f.box,
              borderRadius: 3,
              padding: "7px 9px",
              lineHeight: 1.25,
              overflow: "hidden",
              boxSizing: "border-box",
              border: `1px solid ${f.accent}`,
            }}
          >
            <RulesText text={card.rulesText} />
            {card.flavorText && (
              <>
                {card.rulesText && <hr style={{ border: 0, borderTop: `1px solid ${f.accent}`, margin: "4px 18px 5px", opacity: 0.5 }} />}
                <p style={{ margin: 0, fontStyle: "italic" }}>{card.flavorText}</p>
              </>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 18 }}>
            <span style={{ fontSize: 8, color: "#f4f4f4", fontFamily: "Arial, sans-serif", textShadow: "0 1px 1px #000", lineHeight: 1.2 }}>
              {card.artist ? `Illus. ${card.artist}` : ""}
              <br />
              Proxy · not for sale
            </span>
            {isWalker ? (
              <span style={{ ...stat(f.box), clipPath: "polygon(0 0,100% 0,100% 70%,50% 100%,0 70%)", paddingBottom: 4 }}>
                {card.loyalty || "0"}
              </span>
            ) : isCreature ? (
              <span style={stat(f.box)}>
                {card.power || "0"}/{card.toughness || "0"}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

function Bar({ box, children }: { box: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: box,
        borderRadius: 4,
        padding: "3px 7px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
        height: 24,
        boxShadow: "inset 0 -1px 0 rgba(0,0,0,.25)",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

const stat = (box: string): React.CSSProperties => ({
  background: box,
  border: "1px solid #222",
  borderRadius: 4,
  minWidth: 46,
  textAlign: "center",
  fontWeight: 700,
  fontSize: 15,
  padding: "1px 6px",
  marginTop: -14,
});
