import { atom } from "jotai";

export const openTeamsAtom = atom<string[]>([]);

export const tempOpenTeamsAtom = atom<string[]>([]);

export const openFoldersAtom = atom<string[]>([]);

export const tempOpenDirsAtom = atom<string[]>([]);

export const isDraggingFolderAtom = atom(false);

export const isDraggingTeamAtom = atom(false);
