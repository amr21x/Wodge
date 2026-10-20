import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LoginWrapper } from "../src/features/auth/components/login-wrapper";
import { loginPath, safeRedirect } from "../src/features/auth/redirect";

const mocks = vi.hoisted(() => ({ social: vi.fn(), error: vi.fn() }));
vi.mock("@/features/auth/client", () => ({
  authClient: { signIn: { social: mocks.social } },
}));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("redirect=%2Fworkspace"),
}));
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const target = document.createElement("div");
  document.body.replaceChildren(target);
  root = createRoot(target);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
async function mount() {
  await act(async () => root.render(createElement(LoginWrapper)));
}
function button(provider: "Google" | "GitHub") {
  const button = document.querySelector(
    `button[aria-label="Continue with ${provider}"]`,
  );
  if (!(button instanceof HTMLButtonElement))
    throw new Error("Provider button missing");
  return button;
}

test("demo sign-in exposes only Google and GitHub, without email or OTP controls", async () => {
  await mount();
  expect(button("Google")).toBeDefined();
  expect(button("GitHub")).toBeDefined();
  expect(document.querySelector("input")).toBeNull();
  expect(document.body.textContent).not.toMatch(/email|OTP/);
});

test.each([
  [{ error: { status: 503, code: "SERVICE_UNAVAILABLE" } }, /unavailable/],
  [{ error: { status: 429 } }, /Too many attempts/],
  [{ error: { status: 400, code: "PROVIDER_NOT_FOUND" } }, /unavailable/],
])(
  "OAuth errors release controls and provide safe feedback: %j",
  async (result, message) => {
    mocks.social.mockResolvedValue(result);
    await mount();
    await act(async () => button("Google").click());
    expect(mocks.error).toHaveBeenCalledWith(expect.stringMatching(message));
    expect(button("Google").disabled).toBe(false);
    expect(button("GitHub").disabled).toBe(false);
  },
);

test("a thrown OAuth network error releases pending controls and allows retry", async () => {
  mocks.social.mockRejectedValueOnce(new TypeError("fetch failed"));
  await mount();
  await act(async () => button("GitHub").click());
  expect(mocks.error).toHaveBeenCalledWith(expect.stringMatching(/connection/));
  expect(button("GitHub").disabled).toBe(false);
  mocks.social.mockResolvedValue({ error: null });
  await act(async () => button("GitHub").click());
  expect(mocks.social).toHaveBeenLastCalledWith({
    provider: "github",
    callbackURL: "/workspace",
  });
});

test("both providers are disabled while one sign-in request is pending", async () => {
  let complete: ((result: { error: null }) => void) | undefined;
  mocks.social.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  await mount();
  await act(async () => button("Google").click());
  expect(button("Google").disabled).toBe(true);
  expect(button("GitHub").disabled).toBe(true);
  await act(async () => complete?.({ error: null }));
  expect(button("GitHub").disabled).toBe(false);
});

test.each([
  "https://example.test",
  "//example.test",
  "/\\example.test",
  "/\n/example.test",
])("unsafe redirects fall back to the home page: %j", (value) => {
  expect(safeRedirect(value)).toBe("/");
});

test("login links keep an encoded return path that survives validation", () => {
  const path = "/team/page/a?view=table";
  const link = loginPath(path);
  expect(link).toBe("/login?redirect=%2Fteam%2Fpage%2Fa%3Fview%3Dtable");
  expect(
    safeRedirect(new URL(link, "http://app").searchParams.get("redirect")),
  ).toBe(path);
});
