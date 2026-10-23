import { type ClassValue, clsx } from "clsx";
import { RefObject } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Mutable<Type> = {
  -readonly [Key in keyof Type]: Type[Key];
};

export function randomElement(array: Array<any>) {
  return array[Math.floor(Math.random() * array.length)];
}

export function focusElement(ref: RefObject<any>) {
  if (!ref.current) {
    return;
  }

  const range = document.createRange();
  const selection = window.getSelection();

  range.setStart(ref.current, ref.current.childNodes.length);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}
