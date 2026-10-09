import type { Deck } from "./types";

const ANY_NUMBER = /a deck can have any number of cards named|a deck can have up to/i;

/** Commander deck checks. Warnings only: players decide what's allowed at their table. */
export function validateCommander(deck: Deck): string[] {
  const problems: string[] = [];
  const total = deck.cards.reduce((n, c) => n + c.qty, 0);
  const commanders = deck.cards.filter((c) => c.isCommander);
  if (commanders.length === 0) problems.push("No commander chosen. Click the crown on a card to set one.");
  if (commanders.length > 2) problems.push("More than two commanders.");
  if (total !== 100) problems.push(`Deck has ${total} cards, Commander decks have 100.`);

  const identity = new Set(commanders.flatMap((c) => c.colorIdentity));
  if (commanders.length) {
    const off = deck.cards.filter((c) => !c.isCommander && c.colorIdentity.some((x) => !identity.has(x)));
    if (off.length) problems.push(`Outside your commander's colors: ${off.map((c) => c.name).join(", ")}.`);
  }
  const counts = new Map<string, number>();
  for (const c of deck.cards) {
    if (/\bbasic\b/i.test(c.typeLine) || ANY_NUMBER.test(c.oracleText)) continue;
    counts.set(c.name, (counts.get(c.name) ?? 0) + c.qty);
  }
  const dupes = [...counts].filter(([, n]) => n > 1).map(([name]) => name);
  if (dupes.length) problems.push(`More than one copy of: ${dupes.join(", ")}.`);
  return problems;
}
