import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { createElement, StrictMode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useYDoc } from "../src/features/pages/hooks/use-y-doc";

const mocks = vi.hoisted(() => ({
  provider: vi.fn(),
  indexedDB: vi.fn(),
  token: vi.fn(),
}));
vi.mock("@wodge/env/client", () => ({
  env: { NEXT_PUBLIC_BACKEND_DOMAIN: "http://localhost:8787" },
}));
vi.mock("@/client/api", () => ({
  api: { api: { users: { token: { $get: mocks.token } } } },
}));
vi.mock("y-partyserver/provider", () => ({
  default: mocks.provider.mockImplementation((_host, _room, doc, options) => ({
    doc,
    options,
    connect: vi.fn(),
    destroy: vi.fn(),
  })),
}));
vi.mock("y-indexeddb", () => ({
  IndexeddbPersistence: mocks.indexedDB.mockImplementation(() => ({
    destroy: vi.fn(async () => {}),
  })),
}));

let root: Root;
function Harness({ page }: { page: string }) {
  useYDoc({
    channelId: page,
    folderId: "folder",
    teamId: "team",
    workspaceId: "workspace",
  });
  return null;
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.provider.mockClear();
  mocks.indexedDB.mockClear();
  root = createRoot(document.createElement("div"));
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

test("rerenders reuse a session; page changes dispose providers and documents", async () => {
  await act(async () => root.render(createElement(Harness, { page: "one" })));
  const first = mocks.provider.mock.results[0]!.value;
  const destroyed = vi.fn();
  first.doc.on("destroy", destroyed);
  await act(async () => root.render(createElement(Harness, { page: "one" })));
  expect(mocks.provider).toHaveBeenCalledTimes(1);
  expect(first.connect).toHaveBeenCalledOnce();
  await act(async () => root.render(createElement(Harness, { page: "two" })));
  expect(mocks.provider).toHaveBeenCalledTimes(2);
  expect(first.destroy).toHaveBeenCalledOnce();
  expect(mocks.indexedDB.mock.results[0]!.value.destroy).toHaveBeenCalledOnce();
  expect(destroyed).toHaveBeenCalledOnce();
  mocks.token.mockResolvedValue({ ok: false });
  await expect(
    mocks.provider.mock.results[1]!.value.options.params(),
  ).rejects.toThrow("authentication failed");
});

test("Strict Mode setup replay disposes the first session and leaves the replacement connected", async () => {
  await act(async () =>
    root.render(
      createElement(StrictMode, null, createElement(Harness, { page: "one" })),
    ),
  );
  expect(mocks.provider).toHaveBeenCalledTimes(2);
  const [first, second] = mocks.provider.mock.results.map(
    (result) => result.value,
  );
  expect(first.destroy).toHaveBeenCalledOnce();
  expect(second.destroy).not.toHaveBeenCalled();
  expect(second.connect).toHaveBeenCalledOnce();
});
