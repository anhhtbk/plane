/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderDocumentEditor } from "@/test-utils/document-editor";

const content = {
  type: "doc",
  content: [
    { type: "paragraph", attrs: { id: "intro" }, content: [{ type: "text", text: "Introduction" }] },
    { type: "paragraph", attrs: { id: "details" }, content: [{ type: "text", text: "Details" }] },
  ],
};

/** Ids of the blocks that carry the deep-link highlight. */
const highlightedBlockIds = () =>
  Array.from(document.querySelectorAll('[data-node-highlighted="true"]'), (block) => block.getAttribute("data-id"));

/** Changes the hash the way following a link in the same tab does, once its `hashchange` is handled. */
const changeHash = (hash: string) =>
  new Promise<void>((resolve) => {
    window.addEventListener("hashchange", () => resolve(), { once: true });
    window.location.hash = hash;
  });

afterEach(() => {
  // Reset without a `hashchange`, so no listener of the next test sees this one's hash.
  history.replaceState(null, "", window.location.pathname);
});

describe("Block deep link in the document editor", () => {
  it("highlights the linked block when the page opens with its hash", async () => {
    history.replaceState(null, "", "#details");

    await renderDocumentEditor({ content });

    expect(highlightedBlockIds()).toEqual(["details"]);
  });

  it("highlights the linked block when the hash changes on the open page", async () => {
    await renderDocumentEditor({ content });
    expect(highlightedBlockIds()).toEqual([]);

    await changeHash("#details");
    expect(highlightedBlockIds()).toEqual(["details"]);

    await changeHash("#intro");
    expect(highlightedBlockIds()).toEqual(["intro"]);
  });

  it.each([
    ["an unknown block", "#deleted-block"],
    ["another feature", "#editor-image-block-details"],
  ])("ignores a hash of %s", async (_source, hash) => {
    await renderDocumentEditor({ content });

    await changeHash(hash);

    expect(highlightedBlockIds()).toEqual([]);
  });

  it("clears the highlight when the editor gains focus", async () => {
    await renderDocumentEditor({ content });
    await changeHash("#details");
    expect(highlightedBlockIds()).toEqual(["details"]);

    act(() => document.querySelector<HTMLElement>(".ProseMirror")!.focus());

    expect(highlightedBlockIds()).toEqual([]);
  });

  it("clears the highlight on the next click inside an editor that already has focus", async () => {
    const { user } = await renderDocumentEditor({ content });
    act(() => document.querySelector<HTMLElement>(".ProseMirror")!.focus());
    await changeHash("#details");
    expect(highlightedBlockIds()).toEqual(["details"]);

    await user.click(screen.getByText("Introduction"));

    expect(highlightedBlockIds()).toEqual([]);
  });

  it("clears the highlight on the next click inside a read-only editor", async () => {
    const { user } = await renderDocumentEditor({ content, props: { editable: false } });
    await changeHash("#details");
    expect(highlightedBlockIds()).toEqual(["details"]);

    await user.click(screen.getByText("Introduction"));

    expect(highlightedBlockIds()).toEqual([]);
  });

  it("keeps one working clear when a block is highlighted twice in a row", async () => {
    const { user } = await renderDocumentEditor({ content });
    await changeHash("#details");
    await changeHash("#intro");
    expect(highlightedBlockIds()).toEqual(["intro"]);

    await user.click(screen.getByText("Details"));
    expect(highlightedBlockIds()).toEqual([]);

    await changeHash("#details");
    expect(highlightedBlockIds()).toEqual(["details"]);
    await user.click(screen.getByText("Introduction"));
    expect(highlightedBlockIds()).toEqual([]);
  });
});
