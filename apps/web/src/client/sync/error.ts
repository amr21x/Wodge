/** Local optimistic errors never import the server application runtime. */
export function optimisticError(
  code: string,
  message: string,
  details?: Readonly<Record<string, string | number | boolean>>,
) {
  return Object.assign(new Error(message), { code, details });
}
