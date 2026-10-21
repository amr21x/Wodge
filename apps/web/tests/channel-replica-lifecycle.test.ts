import { createElement, Fragment, StrictMode } from "react";
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi, type Mock } from "vitest";
import { useCurrentRoomRep } from "../src/features/rooms/hooks/use-room-rep";
import { useCurrentThreadRep } from "../src/features/discussions/hooks/use-thread-rep";
import { useCurrentPageRep } from "../src/features/pages/hooks/use-page-rep";
import { useAppStore } from "../src/client/state/store";

type Replica = {
  name: string;
  pull: ReturnType<typeof vi.fn>;
  close: Mock<[], Promise<void>>;
};
const fixture = vi.hoisted(() => ({
  room: vi.fn(),
  thread: vi.fn(),
  page: vi.fn(),
  instances: [] as Replica[],
  channelId: "channel",
  userId: "user",
}));
vi.mock("@/client/sync/rooms/create-room-rep", () => ({
  createRoomRep: fixture.room,
}));
vi.mock("@/client/sync/discussions/create-thread-rep", () => ({
  createThreadRep: fixture.thread,
}));
vi.mock("@/client/sync/pages/create-page-rep", () => ({
  createPageRep: fixture.page,
}));
vi.mock("@/features/account/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ user: { id: fixture.userId } }),
}));
vi.mock("@/features/workspace/state/workspace-provider", () => ({
  useCurrentWorkspace: () => ({
    workspaceId: "workspace",
    structure: {
      teams: [
        {
          id: "team",
          rooms: [{ id: fixture.channelId }],
          threads: [{ id: fixture.channelId }],
          folders: [{ id: "folder", channels: [{ id: fixture.channelId }] }],
        },
      ],
    },
  }),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({
    teamId: "team",
    channelId: fixture.channelId,
    folderId: "folder",
  }),
}));
vi.mock("@wodge/env/client", () => ({
  env: { NEXT_PUBLIC_BACKEND_DOMAIN: "http://localhost:8787" },
}));
vi.mock("@/client/permissions", () => ({ refreshPermissions: vi.fn() }));
vi.mock("partysocket", () => ({
  default: class extends EventTarget {
    close = vi.fn();
  },
}));

let root: Root;
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await useAppStore.getState().actions.reset();
  fixture.instances.length = 0;
  fixture.channelId = "channel";
  fixture.userId = "user";
  const makeReplica = ({
    userId,
    channelId,
  }: {
    userId: string;
    channelId: string;
  }) => {
    const rep = {
      name: `${userId}-${channelId}`,
      pull: vi.fn(),
      close: vi.fn(async () => {}),
    };
    fixture.instances.push(rep);
    return rep;
  };
  fixture.room.mockImplementation(makeReplica);
  fixture.thread.mockImplementation(makeReplica);
  fixture.page.mockImplementation(makeReplica);
  const target = document.createElement("div");
  document.body.replaceChildren(target);
  root = createRoot(target);
});
afterEach(async () => {
  await act(async () => root.unmount());
  await useAppStore.getState().actions.reset();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const hooks = {
  room: useCurrentRoomRep,
  discussion: useCurrentThreadRep,
  page: useCurrentPageRep,
};
type Kind = keyof typeof hooks;
function Consumer({ kind }: { kind: Kind }) {
  const useReplica = hooks[kind];
  useReplica();
  return null;
}
function Consumers({
  kind,
  page = true,
  composer = true,
}: {
  kind: Kind;
  page?: boolean;
  composer?: boolean;
}) {
  return createElement(
    Fragment,
    null,
    page && createElement(Consumer, { kind, key: "page" }),
    composer && createElement(Consumer, { kind, key: "composer" }),
  );
}
async function render(kind: Kind, page = true, composer = true) {
  await act(async () =>
    root.render(createElement(Consumers, { kind, page, composer })),
  );
}
async function notifyChannel() {
  await act(async () => {
    useAppStore.getState().actions.connectSocket(fixture.userId);
    const socket = useAppStore.getState().socket;
    if (!socket) throw new Error("Socket was not connected");
    socket.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          sub: "poke",
          type: "channel",
          id: fixture.channelId,
        }),
      }),
    );
  });
}

test.each(["room", "discussion", "page"] as const)(
  "%s page keeps receiving socket pulls after its poll composer closes",
  async (kind) => {
    await render(kind, true, false);
    const page = fixture.instances[0]!;
    await render(kind);
    const composer = fixture.instances[1]!;
    expect(useAppStore.getState().activeChanRep).toBe(composer);
    await render(kind, true, false);
    expect(composer.close).toHaveBeenCalledOnce();
    expect(page.close).not.toHaveBeenCalled();
    expect(useAppStore.getState().activeChanRep).toBe(page);
    await notifyChannel();
    expect(page.pull).toHaveBeenCalledOnce();
    expect(composer.pull).not.toHaveBeenCalled();
    await render(kind, false, false);
    expect(page.close).toHaveBeenCalledOnce();
    expect(useAppStore.getState().activeChanRep).toBeUndefined();
  },
);

test.each(["room", "discussion"] as const)(
  "%s out-of-order cleanup preserves the remaining consumer",
  async (kind) => {
    await render(kind);
    const [page, composer] = fixture.instances;
    await render(kind, false, true);
    expect(page?.close).toHaveBeenCalledOnce();
    expect(useAppStore.getState().activeChanRep).toBe(composer);
    await notifyChannel();
    expect(composer?.pull).toHaveBeenCalledOnce();
  },
);

test("session reset closes every registered instance and late cleanup cannot restore them", async () => {
  await render("room");
  const [page, composer] = fixture.instances;
  await act(async () => useAppStore.getState().actions.reset());
  expect(page?.close).toHaveBeenCalledOnce();
  expect(composer?.close).toHaveBeenCalledOnce();
  await render("room", true, false);
  expect(useAppStore.getState().activeChanRep).toBeUndefined();
  fixture.userId = "replacement-user";
  await render("room", true, false);
  const replacement = fixture.instances.at(-1);
  expect(useAppStore.getState().activeChanRep).toBe(replacement);
  await notifyChannel();
  expect(replacement?.pull).toHaveBeenCalledOnce();
});

test("Strict Mode replay restores only live registrations", async () => {
  await act(async () =>
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(Consumers, { kind: "room" }),
      ),
    ),
  );
  expect(fixture.instances).toHaveLength(4);
  const [oldPage, oldComposer, page, composer] = fixture.instances;
  expect(oldPage?.close).toHaveBeenCalledOnce();
  expect(oldComposer?.close).toHaveBeenCalledOnce();
  await act(async () =>
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(Consumers, { kind: "room", composer: false }),
      ),
    ),
  );
  expect(composer?.close).toHaveBeenCalledOnce();
  expect(useAppStore.getState().activeChanRep).toBe(page);
  await notifyChannel();
  expect(page?.pull).toHaveBeenCalledOnce();
});
