/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Editor } from "@tiptap/core";
// plugins
import { nodeHighlightPluginKey } from "@/plugins/highlight";

/** Per editor, removes the listeners of the highlight's pending clear. At most one is pending. */
const pendingClears = new WeakMap<Editor, () => void>();

/**
 * Clears the highlight on the user's next pointerdown inside the editor or the editor's next focus,
 * whichever comes first, replacing any clear still pending. Pointerdown covers an editor that already
 * has focus (e.g. after following a block link in place) and a read-only editor, which may never get
 * focus. Registered after the triggering click's pointerdown, so that click keeps its highlight.
 */
function clearHighlightOnNextInteraction(editor: Editor): void {
  pendingClears.get(editor)?.();

  const dom = editor.view.dom;
  const clear = () => {
    removeListeners();
    if (editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(nodeHighlightPluginKey, { nodeId: null }));
  };
  const removeListeners = () => {
    dom.removeEventListener("pointerdown", clear, true);
    editor.off("focus", clear);
    pendingClears.delete(editor);
  };

  dom.addEventListener("pointerdown", clear, true);
  editor.on("focus", clear);
  pendingClears.set(editor, removeListeners);
}

/**
 * Highlights the block whose `id` attribute is `blockId` and scrolls it to the center of the
 * viewport. The highlight clears on the user's next pointerdown inside the editor or the editor's
 * next focus.
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

  clearHighlightOnNextInteraction(editor);

  return true;
}
