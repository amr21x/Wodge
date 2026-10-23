import { useAppStore } from "./store";

export const useActions = () => useAppStore((s) => s.actions);
