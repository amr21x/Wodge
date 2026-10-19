import {
  FLAG_MAX_STALE_MS,
  FLAG_REFRESH_MS,
} from "@wodge/domain/features/models";
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createRequire } from "node:module";
import { resolveFlags } from "@wodge/core/features/flags";
import {
  FeatureFlagsProvider,
  FeatureGate,
  FeatureRouteGate,
} from "../../apps/web/src/components/feature-flags-provider";

const { JSDOM } = createRequire(
  new URL("../../apps/backend/package.json", import.meta.url),
)("jsdom");
const { PathnameContext } = createRequire(
  new URL("../../apps/web/package.json", import.meta.url),
)("next/dist/shared/lib/hooks-client-context.shared-runtime.js");
let root: Root | undefined;
let dom: any;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  dom?.window.close();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("refreshes open routes and controls on disable/enable and expires offline values", async () => {
  vi.useFakeTimers();
  dom = new JSDOM("<div id='root'></div>", { url: "https://app.example" });
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("self", dom.window);
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let pages = true;
  let tasks = true;
  let offline = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (offline) throw new Error("offline");
      return Response.json({
        flags: { ...resolveFlags([]), pages, tasks },
        validUntil: Date.now() + FLAG_MAX_STALE_MS,
        source: "database",
      });
    }),
  );
  const mount = vi.fn();
  const unmount = vi.fn();
  function Session() {
    React.useEffect(() => {
      mount();
      return () => unmount();
    }, []);
    return <p>Page content</p>;
  }
  const container = document.getElementById("root")!;
  root = createRoot(container);
  await act(async () =>
    root!.render(
      <PathnameContext.Provider value="/workspace/page/team/folder/page">
        <FeatureFlagsProvider>
          <FeatureRouteGate>
            <Session />
            <FeatureGate feature="tasks">
              <button>Create task</button>
            </FeatureGate>
          </FeatureRouteGate>
        </FeatureFlagsProvider>
      </PathnameContext.Provider>,
    ),
  );
  expect(container.textContent).toContain("Page content");
  expect(container.textContent).toContain("Create task");
  tasks = false;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(FLAG_REFRESH_MS);
  });
  expect(container.textContent).not.toContain("Create task");
  expect(container.textContent).toContain("Page content");
  pages = false;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(FLAG_REFRESH_MS);
  });
  expect(container.textContent).toContain("currently unavailable");
  pages = true;
  tasks = true;
  await act(async () => {
    window.dispatchEvent(new dom.window.Event("focus"));
  });
  expect(container.textContent).toContain("Create task");
  offline = true;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(FLAG_MAX_STALE_MS - 1);
  });
  expect(container.textContent).toContain("Page content");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(container.textContent).toContain("currently unavailable");
  offline = false;
  await act(async () => {
    window.dispatchEvent(new dom.window.Event("online"));
  });
  expect(container.textContent).toContain("Page content");
  expect(mount).toHaveBeenCalledTimes(1);
  expect(unmount).not.toHaveBeenCalled();
});
