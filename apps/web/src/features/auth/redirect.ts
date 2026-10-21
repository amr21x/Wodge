/** Normalize before checking: browsers also treat backslashes as URL separators. */
export function safeRedirect(value: string | null) {
  if (
    !value ||
    value.includes("\\") ||
    [...value].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

/** Login URL that returns to `returnTo` once signed in; the login page validates it with safeRedirect. */
export function loginPath(returnTo: string) {
  return `/login?redirect=${encodeURIComponent(returnTo)}`;
}
