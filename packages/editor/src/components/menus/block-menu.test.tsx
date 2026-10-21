/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { blockMenuItem, renderDocumentEditor } from "@/test-utils/document-editor";

/**
 * Moves the pointer over the block whose `id` is `blockId`. jsdom has no layout, so nothing is ever
 * under the pointer; for this one move the block is reported as the element at the pointer.
 */
const hoverBlock = (container: HTMLElement, blockId: string) => {
  const block = container.querySelector(`[data-id="${blockId}"]`);
  if (!block) throw new Error(`No rendered block with id "${blockId}"`);
  const elementsFromPoint = vi.spyOn(document, "elementsFromPoint").mockReturnValue([block]);
  fireEvent.mouseMove(container.querySelector(".ProseMirror")!);
  elementsFromPoint.mockRestore();
};

/** The side-menu handles a user can see (and reach) after hovering a block. */
const visibleHandles = (container: HTMLElement) => {
  const sideMenu = container.querySelector<HTMLElement>("#editor-side-menu");
  if (!sideMenu || sideMenu.classList.contains("side-menu-hidden")) return { dragHandle: null, aiHandle: null };
  const dragHandle = sideMenu.querySelector<HTMLElement>("#drag-handle:not(.drag-handle-hidden)");
  const aiHandle = sideMenu.querySelector<HTMLElement>("#ai-handle:not(.handle-hidden)");
  return { dragHandle, aiHandle: aiHandle && aiHandle.style.display !== "none" ? aiHandle : null };
};

/** Labels of every item in the open Block menu, in order. */
const openBlockMenuLabels = (anyItemLabel: string) => {
  const menu = blockMenuItem(anyItemLabel)?.parentElement;
  if (!menu) throw new Error(`The Block menu is not open with "${anyItemLabel}"`);
  return within(menu)
    .getAllByRole("button")
    .map((button) => button.textContent);
};

const content = {
  type: "doc",
  content: [
    { type: "paragraph", attrs: { id: "intro" }, content: [{ type: "text", text: "Introduction" }] },
    { type: "paragraph", attrs: { id: "details" }, content: [{ type: "text", text: "Details" }] },
    {
      type: "bulletList",
      attrs: { id: "steps" },
      content: [
        {
          type: "listItem",
          attrs: { id: "step-one" },
          content: [
            { type: "paragraph", attrs: { id: "step-one-text" }, content: [{ type: "text", text: "Step one" }] },
            {
              type: "bulletList",
              attrs: { id: "sub-steps" },
              content: [
                {
                  type: "listItem",
                  attrs: { id: "sub-step" },
                  content: [
                    {
                      type: "paragraph",
                      attrs: { id: "sub-step-text" },
                      content: [{ type: "text", text: "Sub step" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "paragraph",
      attrs: { id: "notes" },
      content: [{ type: "text", text: "Line one" }, { type: "hardBreak" }, { type: "text", text: "Line two" }],
    },
  ],
};

describe("Block menu in the document editor", () => {
  it("shows Delete and Duplicate for a selected block", async () => {
    const { selectBlock, openBlockMenu } = await renderDocumentEditor({ content });

    expect(blockMenuItem("Delete")).toBeNull();

    selectBlock("details");
    await openBlockMenu();

    expect(blockMenuItem("Delete")).not.toBeNull();
    expect(blockMenuItem("Duplicate")).not.toBeNull();
  });

  describe("Copy link", () => {
    it.each([
      ["a paragraph", "details"],
      ["a nested list item", "sub-step"],
    ])("copies the link of %s once and closes the menu", async (_kind, blockId) => {
      const onCopyBlockLink = vi.fn();
      const { user, selectBlock, openBlockMenu } = await renderDocumentEditor({
        content,
        props: { onCopyBlockLink },
      });

      selectBlock(blockId);
      await openBlockMenu();
      await user.click(blockMenuItem("Copy link")!);

      expect(onCopyBlockLink).toHaveBeenCalledTimes(1);
      expect(onCopyBlockLink).toHaveBeenCalledWith(blockId);
      expect(blockMenuItem("Copy link")).toBeNull();
      expect(blockMenuItem("Delete")).toBeNull();
    });

    it("is not offered when the integrator passes no handler", async () => {
      const { selectBlock, openBlockMenu } = await renderDocumentEditor({ content });

      selectBlock("details");
      await openBlockMenu();

      expect(blockMenuItem("Delete")).not.toBeNull();
      expect(blockMenuItem("Copy link")).toBeNull();
    });

    it("is not offered when the selected node has no id", async () => {
      const onCopyBlockLink = vi.fn();
      const { selectNodeOfType, openBlockMenu } = await renderDocumentEditor({
        content,
        props: { onCopyBlockLink },
      });

      selectNodeOfType("hardBreak");
      await openBlockMenu();

      expect(blockMenuItem("Delete")).not.toBeNull();
      expect(blockMenuItem("Copy link")).toBeNull();
    });
  });

  describe("when the document is read-only", () => {
    it("offers only Copy link, which copies the selected block", async () => {
      const onCopyBlockLink = vi.fn();
      const { user, selectBlock, openBlockMenu } = await renderDocumentEditor({
        content,
        props: { editable: false, onCopyBlockLink },
      });

      selectBlock("sub-step");
      await openBlockMenu();

      expect(openBlockMenuLabels("Copy link")).toEqual(["Copy link"]);

      await user.click(blockMenuItem("Copy link")!);

      expect(onCopyBlockLink).toHaveBeenCalledTimes(1);
      expect(onCopyBlockLink).toHaveBeenCalledWith("sub-step");
      expect(blockMenuItem("Copy link")).toBeNull();
    });

    it("shows a drag handle on hover that cannot drag the block, and no AI handle", async () => {
      const { container } = await renderDocumentEditor({
        content,
        props: { editable: false, onCopyBlockLink: vi.fn() },
      });
      const editorDOM = container.querySelector(".ProseMirror")!;
      const documentBefore = editorDOM.innerHTML;

      hoverBlock(container, "details");
      const { dragHandle, aiHandle } = visibleHandles(container);

      expect(dragHandle).not.toBeNull();
      expect(aiHandle).toBeNull();
      expect(dragHandle!.draggable).toBe(false);
      // The browser cancels a drag that starts from the handle anyway (e.g. a forced dragstart).
      expect(fireEvent.dragStart(dragHandle!)).toBe(false);
      fireEvent.drop(editorDOM);
      expect(editorDOM.innerHTML).toBe(documentBefore);
    });

    it("shows no drag handle and no Block menu without a copy-link handler", async () => {
      const { container, selectBlock, openBlockMenu } = await renderDocumentEditor({
        content,
        props: { editable: false },
      });

      hoverBlock(container, "details");
      expect(visibleHandles(container).dragHandle).toBeNull();

      selectBlock("details");
      await openBlockMenu();
      expect(blockMenuItem("Copy link")).toBeNull();
      expect(blockMenuItem("Delete")).toBeNull();
    });

    it("shows no Block menu on a touch device", async () => {
      const { selectBlock, openBlockMenu } = await renderDocumentEditor({
        content,
        props: { editable: false, isTouchDevice: true, onCopyBlockLink: vi.fn() },
      });

      selectBlock("details");
      await openBlockMenu();

      expect(blockMenuItem("Copy link")).toBeNull();
    });
  });

  it("keeps a draggable drag handle and the AI handle when the document is editable", async () => {
    const { container } = await renderDocumentEditor({ content, props: { onCopyBlockLink: vi.fn() } });

    hoverBlock(container, "details");
    const { dragHandle, aiHandle } = visibleHandles(container);

    expect(dragHandle?.draggable).toBe(true);
    expect(aiHandle).not.toBeNull();
  });
});
