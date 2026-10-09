import { ClientOnly } from "@/components/ClientOnly";
import { DeckList } from "./DeckList";

export const metadata = { title: "Decks · Proxy Table" };

export default function Page() {
  return (
    <ClientOnly>
      <DeckList />
    </ClientOnly>
  );
}
