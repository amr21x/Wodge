import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { DateRange } from "react-day-picker";

export const dbsViewsAtom = atomWithStorage<Record<string, "table" | "kanban">>(
  "dbsViews",
  {},
);

//  const [priority, setPriority] = useState("");
//  const [title, setTitle] = useState("");
//  const [assignees, setAssignees] = useState<string[]>([]);
//  const [due, setDue] = useState<DateRange>();
//  const [includeTime, setIncludeTime] = useState(false);

export const assigneesAtom = atom<string[]>([]);

export const titleAtom = atom("");

export const priorityAtom = atom("");

export const dueAtom = atom<DateRange | undefined>(undefined);

export const includeTimeAtom = atom(false);

export const openDatePicker = atom(false);
