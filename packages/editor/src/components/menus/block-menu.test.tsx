/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, expect, it } from "vitest";
import { blockMenuItem, renderDocumentEditor } from "@/test-utils/document-editor";

const content = {
  type: "doc",
  content: [
    { type: "paragraph", attrs: { id: "intro" }, content: [{ type: "text", text: "Introduction" }] },
    { type: "paragraph", attrs: { id: "details" }, content: [{ type: "text", text: "Details" }] },
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
});
