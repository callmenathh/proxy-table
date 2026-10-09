import { ClientOnly } from "@/components/ClientOnly";
import { CardCreator } from "./CardCreator";

export const metadata = { title: "Card creator · Proxy Table" };

export default function Page() {
  return (
    <ClientOnly>
      <CardCreator />
    </ClientOnly>
  );
}
