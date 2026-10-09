"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/creator", label: "Creator" },
  { href: "/decks", label: "Decks" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="flex items-center gap-6 border-b border-white/10 bg-neutral-950 px-5 py-3">
      <Link href="/" className="font-serif text-lg font-bold tracking-wide text-amber-200">
        Proxy Table
      </Link>
      <nav className="flex gap-4 text-sm">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={path.startsWith(l.href) ? "text-white" : "text-neutral-400 hover:text-neutral-200"}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
