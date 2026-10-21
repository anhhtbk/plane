/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Editor } from "@tiptap/core";
// plugins
import { nodeHighlightPluginKey } from "@/plugins/highlight";

/**
 * Highlights the block whose `id` attribute is `blockId` and scrolls it to the center of the
 * viewport. The highlight clears the next time the editor gains focus.
 *
 * @returns `false`, changing nothing, when no block has that id (unknown or deleted block, or a
 * fragment that is not a block id at all).
 */
export function highlightLinkedBlock(editor: Editor, blockId: string): boolean {
  let pos: number | null = null;
  editor.state.doc.descendants((node, position) => {
    if (pos !== null) return false;
    if (node.attrs.id === blockId) pos = position;
    return pos === null;
  });
  if (pos === null) return false;

  const blockPos = pos;
  editor.view.dispatch(editor.state.tr.setMeta(nodeHighlightPluginKey, { nodeId: blockId }));

  requestAnimationFrame(() => {
    if (editor.isDestroyed) return;
    const blockDOM = editor.view.nodeDOM(blockPos);
    if (blockDOM instanceof HTMLElement) {
      blockDOM.scrollIntoView({ behavior: "instant", block: "center" });
    }
  });

  editor.once("focus", () => {
    editor.view.dispatch(editor.state.tr.setMeta(nodeHighlightPluginKey, { nodeId: null }));
  });

  return true;
}
