import { afterEach, expect, test, vi } from "vitest";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { Dialog } from "../src/components/ui/dialog";
import { AddRoomForm } from "../src/features/workspace/components/add-room-form";
import { createEntityId } from "@wodge/domain/identifiers";

const { updateRoom, createRoom } = vi.hoisted(() => ({
  updateRoom: vi.fn(),
  createRoom: vi.fn(),
}));
vi.mock("@/features/workspace/state/workspace-provider", () => ({
  useCurrentWorkspace: () => ({
    workspaceRep: { mutate: { updateRoom, createRoom } },
  }),
}));
vi.mock("@/features/workspace/hooks/use-member", () => ({
  useMember: () => ({ member: { email: "owner@example.com" } }),
}));
vi.mock("@/features/workspace/settings/settings", () => ({
  SettingsContentHeader: () => null,
  SettingsContentSection: ({ children }: { children: React.ReactNode }) =>
    children,
}));

let root: Root | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.replaceChildren();
  vi.clearAllMocks();
});

async function mount(element: React.ReactElement) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const target = document.createElement("div");
  document.body.appendChild(target);
  root = createRoot(target);
  await act(async () => root!.render(element));
}

test.each([false, true])(
  "room form explains authoritative permissions and offers no legacy access selectors (editing: %s)",
  async (editing) => {
    const room = {
      id: createEntityId(),
      name: "Private room",
      avatar: "",
    };
    const teamId = createEntityId();
    await mount(
      createElement(
        Dialog,
        { defaultOpen: true },
        createElement(AddRoomForm, { teamId, ...(editing && { room }) }),
      ),
    );
    expect(document.querySelector('[name="viewGroups"]')).toBeNull();
    expect(document.querySelector('[name="editGroups"]')).toBeNull();
    expect(document.body.textContent).not.toContain("View groups");
    expect(document.body.textContent).not.toContain("Edit groups");
    expect(document.querySelector('[role="note"]')?.textContent).toMatch(
      /roles and permissions/,
    );
    if (editing) {
      await act(async () => {
        document
          .querySelector("form")!
          .dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          );
      });
      await vi.waitFor(() =>
        expect(updateRoom).toHaveBeenCalledWith({ ...room, teamId }),
      );
    }
  },
);
