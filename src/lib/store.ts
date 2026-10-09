"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { idbStorage } from "./storage";
import type { CustomCard, Deck } from "./types";
import { customColorIdentity, customTypeLine, newId } from "./types";

interface LibraryState {
  hydrated: boolean;
  customCards: CustomCard[];
  decks: Deck[];
  saveCustomCard: (card: CustomCard) => void;
  deleteCustomCard: (id: string) => void;
  createDeck: (name: string) => string;
  saveDeck: (deck: Deck) => void;
  deleteDeck: (id: string) => void;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (setState, getState) => ({
      hydrated: false,
      customCards: [],
      decks: [],
      saveCustomCard: (card) => {
        const saved = { ...card, updatedAt: Date.now() };
        const exists = getState().customCards.some((c) => c.id === card.id);
        setState((s) => ({
          customCards: exists ? s.customCards.map((c) => (c.id === card.id ? saved : c)) : [saved, ...s.customCards],
          // Keep deck entries for this card in sync with its latest text.
          decks: s.decks.map((d) => ({
            ...d,
            cards: d.cards.map((dc) =>
              dc.customId === card.id
                ? {
                    ...dc,
                    name: saved.name || "Untitled",
                    typeLine: customTypeLine(saved),
                    manaCost: saved.manaCost,
                    oracleText: saved.rulesText,
                    colorIdentity: customColorIdentity(saved),
                  }
                : dc,
            ),
          })),
        }));
      },
      deleteCustomCard: (id) => setState((s) => ({ customCards: s.customCards.filter((c) => c.id !== id) })),
      createDeck: (name) => {
        const now = Date.now();
        const deck: Deck = { id: newId(), name, cards: [], unresolved: [], createdAt: now, updatedAt: now };
        setState((s) => ({ decks: [deck, ...s.decks] }));
        return deck.id;
      },
      saveDeck: (deck) =>
        setState((s) => ({ decks: s.decks.map((d) => (d.id === deck.id ? { ...deck, updatedAt: Date.now() } : d)) })),
      deleteDeck: (id) => setState((s) => ({ decks: s.decks.filter((d) => d.id !== id) })),
    }),
    {
      name: "proxy-table-library",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ customCards: s.customCards, decks: s.decks }),
      onRehydrateStorage: () => () => useLibrary.setState({ hydrated: true }),
    },
  ),
);
