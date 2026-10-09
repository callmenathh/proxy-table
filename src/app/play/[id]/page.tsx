import { Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { SoloTable } from "./SoloTable";

export const metadata = { title: "Solo table · Proxy Table" };

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-neutral-500">Loading…</p>}>
      <ClientOnly>
        <SoloTable />
      </ClientOnly>
    </Suspense>
  );
}
