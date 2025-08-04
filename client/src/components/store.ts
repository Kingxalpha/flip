import { atom } from "jotai";

export const GameIdAtom = atom<string | null>(null);
export const SelectedSideAtom = atom<"heads" | "tails" | null>(null);
export const ProofAtom = atom<string | null>(null);
export const SeedAtom = atom<string | null>(null);
