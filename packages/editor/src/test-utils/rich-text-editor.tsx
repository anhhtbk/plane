/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Editor } from "@tiptap/core";
import { render, waitFor } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import { RichTextEditorWithRef } from "@/components/editors";
import type { IRichTextEditorProps } from "@/types";
import { inertFileHandler } from "./document-editor";

/**
 * The required props of a rich-text editor (e.g. a work item description), with inert handlers. The
 * bubble menu is off: its tippy tooltip cannot mount in jsdom.
 */
const defaultProps: IRichTextEditorProps = {
  bubbleMenuEnabled: false,
  disabledExtensions: [],
  editable: true,
  extendedEditorProps: {},
  fileHandler: inertFileHandler,
  flaggedExtensions: [],
  getEditorMetaData: () => ({ file_assets: [], user_mentions: [] }),
  id: "test-rich-text-editor",
  initialValue: "",
  mentionHandler: { renderComponent: () => null },
};

type RenderRichTextEditorOptions = {
  /** Initial content as HTML. */
  content: string;
  /** Overrides for any rich-text editor prop (e.g. `editable`). */
  props?: Partial<IRichTextEditorProps>;
};

/** Renders the rich-text editor the way the document editor harness renders the document editor. */
export async function renderRichTextEditor({
  content,
  props,
}: RenderRichTextEditorOptions): Promise<RenderResult & { user: UserEvent }> {
  const user = userEvent.setup();
  const result = render(<RichTextEditorWithRef {...defaultProps} {...props} initialValue={content} />);

  await waitFor(() => {
    const dom = result.container.querySelector<HTMLElement & { editor?: Editor }>(".ProseMirror");
    if (!dom?.editor) throw new Error("Rich-text editor did not mount");
  });

  return { ...result, user };
}
