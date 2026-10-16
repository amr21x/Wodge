// Structural readonly view of JSON state; no sync client dependency is needed.
type DeepReadonly<T> = T extends null | boolean | string | number | undefined
  ? T
  : DrObj<T>;

export type DrObj<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };
