import { Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { DeckEditor } from "./DeckEditor";

export const metadata = { title: "Deck · Proxy Table" };

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-neutral-500">Loading…</p>}>
      <ClientOnly>
        <DeckEditor />
      </ClientOnly>
    </Suspense>
  );
}
