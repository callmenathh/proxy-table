"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CardView } from "@/components/CardView";
import { useLibrary } from "@/lib/store";

export function DeckList() {
  const { hydrated, decks, createDeck } = useLibrary();
  const [name, setName] = useState("");
  const router = useRouter();

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const id = createDeck(name.trim() || "New deck");
    router.push(`/decks/${id}`);
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6">
      <form onSubmit={create} className="flex max-w-md gap-2">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Deck name" />
        <button className="btn-primary shrink-0">New deck</button>
      </form>
      {!hydrated && <p className="mt-8 text-neutral-500">Loading…</p>}
      {hydrated && decks.length === 0 && (
        <p className="mt-8 text-neutral-400">No decks yet. Make one, then paste a decklist from Moxfield, Archidekt or anywhere else.</p>
      )}
      <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
        {decks.map((d) => {
          const commander = d.cards.find((c) => c.isCommander) ?? d.cards[0];
          const total = d.cards.reduce((n, c) => n + c.qty, 0);
          return (
            <Link key={d.id} href={`/decks/${d.id}`} className="group">
              <div className="overflow-hidden rounded-lg ring-1 ring-white/10 group-hover:ring-amber-400/60">
                {commander ? <CardView card={commander} width={220} /> : <div className="aspect-[63/88] w-full bg-neutral-800" />}
              </div>
              <p className="mt-2 truncate font-medium text-white">{d.name}</p>
              <p className="text-xs text-neutral-400">{total} cards</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
