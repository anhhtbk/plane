/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// jsdom runs no layout; patching its prototypes is this file's purpose.
/* oxlint-disable no-extend-native */

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom runs no layout, so no element is ever under a point. The drag handle's own click handler
// hit-tests with `elementsFromPoint`, which jsdom leaves unimplemented; tests select the block
// themselves instead (see `src/test-utils/document-editor.tsx`).
document.elementsFromPoint ??= () => [];

// ProseMirror hit-tests a click with `elementFromPoint` too; with no element under the point it
// falls back to the editor's own DOM, so clicks still reach its click handlers.
document.elementFromPoint ??= () => null;

// ProseMirror measures text ranges to scroll the selection into view after commands such as the
// Block menu's Delete; jsdom implements neither method on `Range`. An empty box matches "no layout".
Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
Range.prototype.getBoundingClientRect ??= () => new DOMRect();

// Following a block link scrolls the block into view; jsdom leaves `scrollIntoView` unimplemented.
// Without layout there is nothing to scroll.
Element.prototype.scrollIntoView ??= () => {};

// jsdom has no canvas backend; `is-emoji-supported` probes one on import. `null` is what browsers
// return for an unsupported context.
HTMLCanvasElement.prototype.getContext = () => null;

afterEach(() => {
  cleanup();
});
