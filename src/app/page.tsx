import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="font-serif text-4xl font-bold text-amber-200">Proxy Table</h1>
        <p className="mt-3 text-lg text-neutral-300">
          Build Commander decks with official cards, your own proxy art, and cards you design yourself. Then play them in
          the browser.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/creator" className="rounded-xl border border-white/10 bg-neutral-900 p-5 hover:border-amber-400/50">
          <h2 className="font-semibold text-white">Card creator</h2>
          <p className="mt-1 text-sm text-neutral-400">Upload art, fill in the card, and see it as you type.</p>
        </Link>
        <Link href="/decks" className="rounded-xl border border-white/10 bg-neutral-900 p-5 hover:border-amber-400/50">
          <h2 className="font-semibold text-white">Decks</h2>
          <p className="mt-1 text-sm text-neutral-400">Paste a decklist, swap in proxies, and goldfish it on a solo table.</p>
        </Link>
      </div>
      <p className="text-xs text-neutral-500">
        Card data and images from Scryfall. Unofficial fan content, not approved or endorsed by Wizards of the Coast.
        Everything you make is saved in this browser.
      </p>
    </main>
  );
}
