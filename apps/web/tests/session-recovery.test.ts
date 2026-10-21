import { createElement } from "react";
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { SessionRecovery } from "../src/features/auth/components/session-recovery";
import { queryClient } from "../src/client/query";
import { accessFailureEvent } from "../src/client/errors";

const state = vi.hoisted(() => ({
  identity: "one" as string | null,
  sessionId: "session-one",
  reset: vi.fn(async () => {}),
  getSession: vi.fn(async () => ({})),
  notify: vi.fn(),
}));
vi.mock("@wodge/auth/client", () => ({
  authClient: {
    useSession: () => ({
      data: state.identity
        ? { user: { id: state.identity }, session: { id: state.sessionId } }
        : null,
      isPending: false,
    }),
    getSession: state.getSession,
    $store: { notify: state.notify },
  },
}));
vi.mock("@/client/state/store", () => ({
  useAppStore: { getState: () => ({ actions: { reset: state.reset } }) },
}));
vi.mock("@wodge/env/client", () => ({
  env: { NEXT_PUBLIC_AVATARS_URL: "http://localhost" },
}));
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  state.identity = "one";
  state.sessionId = "session-one";
  vi.clearAllMocks();
  queryClient.clear();
  const target = document.createElement("div");
  document.body.replaceChildren(target);
  root = createRoot(target);
});
afterEach(async () => {
  await act(async () => root.unmount());
  queryClient.clear();
  vi.unstubAllGlobals();
});
async function render() {
  await act(async () => root.render(createElement(SessionRecovery)));
}

test("session loss clears protected queries and closes instances without deleting offline data", async () => {
  await render();
  queryClient.setQueryData(["permission", "workspace", "one"], true);
  queryClient.setQueryData(["user", "one"], { id: "one" });
  state.identity = null;
  await render();
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  expect(state.reset).toHaveBeenCalledOnce();
  expect(document.body.textContent).toContain("session has expired");
});

test("switching accounts clears the previous identity's queries and connections", async () => {
  await render();
  queryClient.setQueryData(["authorization", "workspace", "one"], {
    roles: ["private"],
  });
  state.identity = "two";
  await render();
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  expect(state.reset).toHaveBeenCalledOnce();
});

test("a server denial drops cached allows; unauthorized responses also refresh Better Auth", async () => {
  await render();
  queryClient.setQueryData(["permission", "workspace", "one"], true);
  await act(async () =>
    window.dispatchEvent(new CustomEvent(accessFailureEvent, { detail: 403 })),
  );
  expect(queryClient.getQueryData(["permission", "workspace", "one"])).toBe(
    false,
  );
  await act(async () =>
    window.dispatchEvent(new CustomEvent(accessFailureEvent, { detail: 401 })),
  );
  expect(state.getSession).toHaveBeenCalledWith({
    query: { disableCookieCache: true },
  });
  expect(state.notify).toHaveBeenCalledWith("$sessionSignal");
});

test("renewing the same account under a different session discards old grants", async () => {
  await render();
  queryClient.setQueryData(["permission", "workspace", "one"], true);
  state.sessionId = "session-two";
  await render();
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  expect(state.reset).toHaveBeenCalledOnce();
});
