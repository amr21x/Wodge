import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { DateRange } from "react-day-picker";

export const dbsViewsAtom = atomWithStorage<Record<string, "table" | "kanban">>(
  "dbsViews",
  {},
);

export const assigneesAtom = atom<string[]>([]);

export const titleAtom = atom("");

export const priorityAtom = atom("");

export const dueAtom = atom<DateRange | undefined>(undefined);

export const includeTimeAtom = atom(false);
