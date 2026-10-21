/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, expect, it, vi } from "vitest";
import { blockMenuItem, renderDocumentEditor } from "@/test-utils/document-editor";

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
});
