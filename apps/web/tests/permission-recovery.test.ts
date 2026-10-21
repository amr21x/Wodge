import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  QueryClientProvider,
  notifyManager,
  onlineManager,
} from "@tanstack/react-query";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { queryClient } from "../src/client/query";
import { refreshPermissions } from "../src/client/permissions";
import { useRoomAction } from "../src/features/workspace/hooks/use-room-action";
import type { Permissions } from "@wodge/domain/authorization/permissions";
import { useChannelPermission } from "../src/features/workspace/hooks/use-channel-permission";
import {
  useSubscribe,
  type Subscribable,
} from "../src/client/sync/use-subscribe";

const state = vi.hoisted(() => ({
  workspaceId: "one",
  user: { id: "user" },
  channelId: "room",
}));
vi.mock("@/features/workspace/state/workspace-provider", () => ({
  useCurrentWorkspace: () => ({ workspaceId: state.workspaceId }),
}));
vi.mock("@/features/account/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ user: state.user }),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ channelId: state.channelId }),
}));
let root: Root;
const requests: { url: string; body: unknown }[] = [];
let allowed = true;
let unavailable = false;
beforeEach(() => {
  notifyManager.setNotifyFunction((callback) => {
    act(() => callback());
  });
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  state.workspaceId = "one";
  requests.length = 0;
  allowed = true;
  unavailable = false;
  queryClient.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      requests.push({ url, body: JSON.parse(String(init.body)) });
      if (unavailable)
        return Response.json(
          { error: { code: "AUTHORIZATION_UNAVAILABLE" } },
          { status: 503 },
        );
      return Response.json(
        allowed
          ? { success: true }
          : { success: false, code: "AUTHORIZATION_FORBIDDEN" },
      );
    }),
  );
  const target = document.createElement("div");
  document.body.replaceChildren(target);
  root = createRoot(target);
});
afterEach(async () => {
  await act(async () => root.unmount());
  queryClient.clear();
  onlineManager.setOnline(true);
  notifyManager.setNotifyFunction((callback) => callback());
  vi.unstubAllGlobals();
});
function Permission() {
  const canEdit = useChannelPermission({ type: "room" }, "update");
  return createElement("button", { disabled: !canEdit }, "Send");
}
async function mount() {
  await act(async () =>
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(Permission),
      ),
    ),
  );
}
const writable = () => document.querySelector("button")?.disabled === false;

test("room actions use backend read/send grants and a removed grant disables controls", async () => {
  await mount();
  await vi.waitFor(() => expect(writable()).toBe(true));
  expect(requests[0]?.body).toEqual({
    scope: { type: "room", id: "room" },
    permissions: { room: ["read"], message: ["send"] },
  });
  allowed = false;
  await act(async () => refreshPermissions());
  await vi.waitFor(() => expect(writable()).toBe(false));
});

test("a failed refresh discards a previous allow decision", async () => {
  await mount();
  await vi.waitFor(() => expect(writable()).toBe(true));
  unavailable = true;
  await act(async () =>
    queryClient.invalidateQueries({ queryKey: ["permission"] }),
  );
  await vi.waitFor(() => expect(writable()).toBe(false));
});

test("switching workspace never uses the previous workspace grant", async () => {
  await mount();
  await vi.waitFor(() => expect(writable()).toBe(true));
  state.workspaceId = "two";
  allowed = false;
  await mount();
  expect(writable()).toBe(false);
  await vi.waitFor(() =>
    expect(requests.some((request) => request.url.includes("/two/"))).toBe(
      true,
    ),
  );
});

test("subscription snapshots and queued callbacks cannot cross workspace instances", async () => {
  let firstData: ((data: string) => void) | undefined;
  let secondData: ((data: string) => void) | undefined;
  const first: Subscribable<string> = {
    subscribe: (_query, options) => {
      firstData = (value) => {
        void _query(value).then(options.onData);
      };
      return () => {};
    },
  };
  const second: Subscribable<string> = {
    subscribe: (_query, options) => {
      secondData = (value) => {
        void _query(value).then(options.onData);
      };
      return () => {};
    },
  };
  // The generic subscription receives only strings from this query.
  const values: string[] = [];
  function Subscription({ source }: { source: Subscribable<string> }) {
    const { snapshot } = useSubscribe(source, async (value) => value, {
      default: "pending",
    });
    values.push(snapshot);
    return createElement("span", null, snapshot);
  }
  await act(async () =>
    root.render(createElement(Subscription, { source: first })),
  );
  await act(async () => firstData?.("old workspace"));
  values.length = 0;
  await act(async () =>
    root.render(createElement(Subscription, { source: second })),
  );
  expect(values).not.toContain("old workspace");
  await act(async () => {
    firstData?.("late old workspace");
    secondData?.("new workspace");
  });
  expect(document.body.textContent).toBe("new workspace");
});

test.each(["editOwn", "deleteOwn", "moderate", "vote"] as const)(
  "room %s controls follow the corresponding backend action",
  async (action) => {
    function Action({
      action,
    }: {
      action: NonNullable<Permissions["message"]>[number];
    }) {
      const allowed = useRoomAction(action);
      return createElement("button", { disabled: !allowed }, action);
    }
    await act(async () =>
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Action, { action }),
        ),
      ),
    );
    await vi.waitFor(() => expect(writable()).toBe(true));
    expect(requests[0]?.body).toEqual({
      scope: { type: "room", id: "room" },
      permissions: { room: ["read"], message: [action] },
    });
    allowed = false;
    await act(async () => refreshPermissions());
    await vi.waitFor(() => expect(writable()).toBe(false));
  },
);

test("ordinary offline pauses retain a previously checked grant until an explicit denial", async () => {
  await mount();
  await vi.waitFor(() => expect(writable()).toBe(true));
  await act(async () => {
    onlineManager.setOnline(false);
    refreshPermissions();
  });
  expect(writable()).toBe(true);
  await act(async () => refreshPermissions({ refetch: false, revoke: true }));
  await vi.waitFor(() => expect(writable()).toBe(false));
});
