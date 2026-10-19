import { memo } from "react";

interface EditorCountsProps {
  characters: number;
  words: number;
}

export const EditorCounts = memo(({ characters, words }: EditorCountsProps) => (
  <div className="flex flex-col justify-center text-right">
    <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
      {words} {words === 1 ? "word" : "words"}
    </div>
    <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
      {characters} {characters === 1 ? "character" : "characters"}
    </div>
  </div>
));
