/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { getAttributes } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import type { MarkType } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
// helpers
import { highlightLinkedBlock } from "@/helpers/block-deep-link";

type ClickHandlerOptions = {
  editor: Editor;
  /** Whether a block link of the open page is followed in place rather than in a new tab. */
  followBlockLinksInPlace: boolean;
  type: MarkType;
};

/** A pathname without its trailing slash, so `/a/b` and `/a/b/` name the same page. */
const withoutTrailingSlash = (pathname: string): string => pathname.replace(/\/+$/, "");

/**
 * The hash of a plain left click on a link to a block of the open page (same origin and path,
 * ignoring a trailing slash, non-empty hash), or `null` for any other click, which keeps opening
 * in a new tab.
 */
function getSamePageBlockHash(event: MouseEvent): string | null {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = event.target instanceof Element ? event.target.closest("a") : null;
  if (!anchor?.href || !URL.canParse(anchor.href)) return null;
  const url = new URL(anchor.href);
  const isOpenPage =
    url.origin === window.location.origin &&
    withoutTrailingSlash(url.pathname) === withoutTrailingSlash(window.location.pathname);
  return isOpenPage && url.hash.length > 1 ? url.hash : null;
}

export function clickHandler(options: ClickHandlerOptions): Plugin {
  const getInPlaceBlockHash = (event: MouseEvent): string | null =>
    options.followBlockLinksInPlace ? getSamePageBlockHash(event) : null;

  return new Plugin({
    key: new PluginKey("handleClickLink"),
    props: {
      handleClick: (view, pos, event) => {
        if (event.button !== 0) {
          return false;
        }

        // Followed in place by the `click` handler below.
        if (getInPlaceBlockHash(event)) {
          return false;
        }

        let a = event.target as HTMLElement;
        const els: HTMLElement[] = [];

        while (a?.nodeName !== "DIV") {
          els.push(a);
          a = a?.parentNode as HTMLElement;
        }

        if (!els.find((value) => value.nodeName === "A")) {
          return false;
        }

        const attrs = getAttributes(view.state, options.type.name);
        const link = event.target as HTMLLinkElement;

        const href = link?.href ?? attrs.href;
        const target = link?.target ?? attrs.target;

        if (link && href) {
          // Defence-in-depth: link.href is the browser-resolved URL (whitespace
          // already stripped by the browser's WHATWG URL parser), so a protocol
          // check here is sufficient to catch any dangerous URI that slipped past
          // the editor's parse/render-time guards. Matches the blocked-scheme list
          // in isValidHttpUrl (javascript:, data:, vbscript:, file:, about:)
          // to keep the policy consistent (GHSA-v2vv-7wq3-8w2j).
          if (/^(javascript|data|vbscript|file|about):/i.test(href)) {
            return false;
          }

          window.open(href, target);

          return true;
        }

        return false;
      },
      handleDOMEvents: {
        // With `followBlockLinksInPlace`, a block link of the open page scrolls to and highlights its
        // block in place, in editable and read-only editors alike. `handleClick` runs on mouseup, too
        // early to stop a read-only editor's browser from following the `target="_blank"` link, so
        // the click is handled here.
        click: (_view, event) => {
          const hash = getInPlaceBlockHash(event);
          if (!hash) return false;
          event.preventDefault();
          // Setting an unchanged hash fires no `hashchange`, so highlight directly.
          if (hash === window.location.hash) {
            highlightLinkedBlock(options.editor, hash.slice(1));
          } else {
            window.location.hash = hash;
          }
          return true;
        },
      },
    },
  });
}
