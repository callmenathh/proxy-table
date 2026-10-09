"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Everything is saved in the browser, so these pages render only on the client. */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  return isClient ? children : <p className="p-6 text-neutral-500">Loading…</p>;
}
