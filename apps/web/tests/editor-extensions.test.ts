import { afterEach, expect, test, vi } from "vitest";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Emoji, gitHubEmojis } from "@tiptap/extension-emoji";
import { FileHandler } from "@tiptap/extension-file-handler";
import { TableOfContents } from "@tiptap/extension-table-of-contents";
import { ContentItemMenu } from "../src/features/editor/content-item-menu/content-item-menu";
import { Slice } from "@tiptap/pm/model";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

// JSDOM has no native emoji renderer; this suite checks editor integration.
vi.hoisted(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
const editors: Editor[] = [];
afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  document.body.replaceChildren();
});

function mount(
  extensions: NonNullable<
    ConstructorParameters<typeof Editor>[0]
  >["extensions"],
  content = "<p>Hello</p>",
) {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const editor = new Editor({ element, extensions, content });
  editors.push(editor);
  return editor;
}

test("public emoji extension preserves named emoji nodes through JSON and HTML", () => {
  const extensions = [
    StarterKit,
    Emoji.configure({ enableEmoticons: true, emojis: gitHubEmojis }),
  ];
  const first = mount(extensions);
  expect(first.commands.setEmoji("smile")).toBe(true);
  expect(first.getJSON().content?.[0]?.content?.[0]).toMatchObject({
    type: "emoji",
    attrs: { name: "smile" },
  });
  const restored = mount(extensions, first.getHTML());
  expect(restored.getJSON()).toEqual(first.getJSON());
});

test("public file handler filters pasted MIME types and supplies the configured callback", () => {
  const onPaste = vi.fn();
  const editor = mount([
    StarterKit,
    FileHandler.configure({ allowedMimeTypes: ["image/png"], onPaste }),
  ]);
  const image = new File(["image"], "image.png", { type: "image/png" });
  const text = new File(["text"], "text.txt", { type: "text/plain" });
  const paste = (files: File[]) => {
    const event = {
      clipboardData: { files, getData: () => "" },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as ClipboardEvent;
    return editor.view.someProp("handlePaste", (handler) =>
      handler(editor.view, event, Slice.empty),
    );
  };
  expect(paste([text])).toBeFalsy();
  expect(onPaste).not.toHaveBeenCalled();
  expect(paste([image, text])).toBe(true);
  expect(onPaste).toHaveBeenCalledWith(editor, [image], "");
});

test("public table of contents exposes heading data and stable anchor IDs", async () => {
  const editor = mount(
    [
      StarterKit,
      TableOfContents.configure({
        getId: (text) => text.toLowerCase().replaceAll(" ", "-"),
      }),
    ],
    "<h1>Overview</h1><h2>Details</h2>",
  );
  await vi.waitFor(() =>
    expect(editor.storage.tableOfContents.content).toHaveLength(2),
  );
  expect(editor.storage.tableOfContents.content).toMatchObject([
    { id: "overview", level: 1, textContent: "Overview" },
    { id: "details", level: 2, textContent: "Details" },
  ]);
  expect(editor.getHTML()).toContain('data-toc-id="overview"');
});

test("public React drag handle registers and removes its editor plugin", async () => {
  const editor = mount([StarterKit]);
  const element = document.createElement("div");
  document.body.appendChild(element);
  const root = createRoot(element);
  const originalPlugins = new Set(editor.state.plugins);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  try {
    await act(async () =>
      root.render(createElement(ContentItemMenu, { editor })),
    );
    expect(
      editor.state.plugins.some((plugin) => !originalPlugins.has(plugin)),
    ).toBe(true);
  } finally {
    await act(async () => root.unmount());
  }
  expect(
    editor.state.plugins.some((plugin) => !originalPlugins.has(plugin)),
  ).toBe(false);
});
