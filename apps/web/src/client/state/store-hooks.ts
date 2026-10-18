import { useAppStore } from "./store";

export const useUserStore = () => useAppStore((s) => s.userStore);

export const useWorkspaceStore = (wid: string) =>
  useAppStore((s) => s.workspaces[wid]);

export const useActions = () => useAppStore((s) => s.actions);
