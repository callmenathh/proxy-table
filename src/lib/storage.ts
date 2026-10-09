import { del, get, set } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

/** IndexedDB storage, since card art is too big for localStorage. */
export const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: (name, value) => set(name, value),
  removeItem: (name) => del(name),
};
