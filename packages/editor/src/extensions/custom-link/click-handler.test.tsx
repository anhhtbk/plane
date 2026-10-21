/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import { renderDocumentEditor } from "@/test-utils/document-editor";
import { renderRichTextEditor } from "@/test-utils/rich-text-editor";

const pageURL = () => `${window.location.origin}${window.location.pathname}`;

const contentWithLink = (href: string) => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { id: "intro" },
      content: [{ type: "text", text: "Read the details", marks: [{ type: "link", attrs: { href } }] }],
    },
    { type: "paragraph", attrs: { id: "details" }, content: [{ type: "text", text: "Details" }] },
  ],
});

/** Ids of the blocks that carry the deep-link highlight. */
const highlightedBlockIds = () =>
  Array.from(document.querySelectorAll('[data-node-highlighted="true"]'), (block) => block.getAttribute("data-id"));

/** Whether the browser was told not to follow the last clicked link itself. */
let lastClickPrevented: boolean | undefined;
const recordClick = (event: MouseEvent) => {
  lastClickPrevented = event.defaultPrevented;
};

/** Resolves once the next `hashchange` has been handled. */
const nextHashChange = () =>
  new Promise<void>((resolve) => window.addEventListener("hashchange", () => resolve(), { once: true }));

let openSpy: MockInstance<Window["open"]>;

beforeEach(() => {
  openSpy = vi.spyOn(window, "open").mockReturnValue(null);
  lastClickPrevented = undefined;
  window.addEventListener("click", recordClick);
});

afterEach(() => {
  window.removeEventListener("click", recordClick);
  openSpy.mockRestore();
  // Reset without a `hashchange`, so no listener of the next test sees this one's hash or path.
  history.replaceState(null, "", "/");
});

describe.each([
  ["editable", true],
  ["read-only", false],
])("Link click in the %s document editor", (_mode, editable) => {
  it("follows a block link of the open page in place", async () => {
    const { user } = await renderDocumentEditor({
      content: contentWithLink(`${pageURL()}#details`),
      props: { editable },
    });

    const hashChange = nextHashChange();
    await user.click(screen.getByText("Read the details"));
    await hashChange;

    expect(window.location.hash).toBe("#details");
    expect(highlightedBlockIds()).toEqual(["details"]);
    expect(openSpy).not.toHaveBeenCalled();
    expect(lastClickPrevented).toBe(true);
  });

  it("highlights the block again when its link is already the page hash", async () => {
    const { user } = await renderDocumentEditor({
      content: contentWithLink(`${pageURL()}#details`),
      props: { editable },
    });
    history.replaceState(null, "", "#details");
    expect(highlightedBlockIds()).toEqual([]);

    await user.click(screen.getByText("Read the details"));

    expect(highlightedBlockIds()).toEqual(["details"]);
    expect(openSpy).not.toHaveBeenCalled();
    expect(lastClickPrevented).toBe(true);
  });

  it("clears the followed block's highlight on the next click in the editor", async () => {
    const { user } = await renderDocumentEditor({
      content: contentWithLink(`${pageURL()}#details`),
      props: { editable },
    });
    const hashChange = nextHashChange();
    await user.click(screen.getByText("Read the details"));
    await hashChange;
    expect(highlightedBlockIds()).toEqual(["details"]);

    await user.click(screen.getByText("Details"));

    expect(highlightedBlockIds()).toEqual([]);
  });

  it.each([
    ["without a trailing slash on a slashed page path", "/workspace/pages/p1/", "/workspace/pages/p1#details"],
    ["with a trailing slash on a slashless page path", "/workspace/pages/p1", "/workspace/pages/p1/#details"],
  ])("follows a block link of the open page %s in place", async (_case, pagePath, href) => {
    history.replaceState(null, "", pagePath);
    const { user } = await renderDocumentEditor({
      content: contentWithLink(`${window.location.origin}${href}`),
      props: { editable },
    });

    const hashChange = nextHashChange();
    await user.click(screen.getByText("Read the details"));
    await hashChange;

    expect(window.location.pathname).toBe(pagePath);
    expect(window.location.hash).toBe("#details");
    expect(highlightedBlockIds()).toEqual(["details"]);
    expect(openSpy).not.toHaveBeenCalled();
    expect(lastClickPrevented).toBe(true);
  });

  it.each([
    ["another page", "https://plane.example/workspace/pages/other#details"],
    ["the open page without a block", "/"],
  ])("opens a link to %s in a new tab", async (_target, href) => {
    const { user } = await renderDocumentEditor({ content: contentWithLink(href), props: { editable } });

    await user.click(screen.getByText("Read the details"));

    expect(openSpy).toHaveBeenCalledWith(new URL(href, window.location.href).href, "_blank");
    expect(highlightedBlockIds()).toEqual([]);
  });

  it("opens a block link of the open page in a new tab on a modifier click", async () => {
    const href = `${pageURL()}#details`;
    const { user } = await renderDocumentEditor({ content: contentWithLink(href), props: { editable } });

    await user.keyboard("{Control>}");
    await user.click(screen.getByText("Read the details"));
    await user.keyboard("{/Control}");

    expect(openSpy).toHaveBeenCalledWith(href, "_blank");
    expect(highlightedBlockIds()).toEqual([]);
  });
});

describe.each([
  ["editable", true],
  ["read-only", false],
])("Link click in the %s rich-text editor", (_mode, editable) => {
  it("opens a block link of the open page in a new tab", async () => {
    const href = `${pageURL()}#details`;
    const { user } = await renderRichTextEditor({
      content: `<p id="intro"><a href="${href}">Read the details</a></p><p id="details">Details</p>`,
      props: { editable },
    });

    await user.click(screen.getByText("Read the details"));

    expect(openSpy).toHaveBeenCalledWith(href, "_blank");
    expect(window.location.hash).toBe("");
    expect(highlightedBlockIds()).toEqual([]);
  });
});
