import type { ScryfallCard } from "./scryfall";
import type { CustomCard, Rarity } from "./types";

const SUPERTYPES = new Set(["Legendary", "Basic", "Snow", "World", "Ongoing", "Host"]);

/** Copies a real card's rules onto a custom card, keeping the custom art. */
export function applyReprint(draft: CustomCard, card: ScryfallCard): CustomCard {
  const face = card.card_faces?.[0] ?? card;
  const typeLine = face.type_line ?? card.type_line ?? "";
  const [left, subtypes = ""] = typeLine.split(" — ");
  const words = left.split(" ");
  const rarity: Rarity = (["common", "uncommon", "rare", "mythic"] as const).find((r) => r === card.rarity) ?? "rare";
  return {
    ...draft,
    name: card.name,
    manaCost: face.mana_cost ?? card.mana_cost ?? "",
    supertypes: words.filter((w) => SUPERTYPES.has(w)).join(" "),
    cardType: words.filter((w) => !SUPERTYPES.has(w)).join(" "),
    subtypes,
    rulesText: card.card_faces ? (card.oracle_text ?? card.card_faces.map((f) => `${f.name}: ${f.oracle_text ?? ""}`).join("\n")) : (card.oracle_text ?? ""),
    power: face.power ?? "",
    toughness: face.toughness ?? "",
    loyalty: face.loyalty ?? "",
    colors: face.colors ?? card.colors ?? [],
    rarity,
    reprintOf: { scryfallId: card.id, name: card.name, colorIdentity: card.color_identity },
  };
}
