/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Content, Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import { DocumentEditorWithRef } from "@/components/editors";
import type { IDocumentEditorProps } from "@/types";

const noop = () => {};
const rejectAsset = () => Promise.reject(new Error("Assets are not available in tests"));

/** The required props of a non-collaborative document editor, with inert handlers. */
const defaultProps: IDocumentEditorProps = {
  disabledExtensions: [],
  editable: true,
  extendedEditorProps: {},
  fileHandler: {
    assetsUploadStatus: {},
    cancel: noop,
    checkIfAssetExists: () => Promise.resolve(false),
    delete: () => Promise.resolve(),
    duplicate: rejectAsset,
    getAssetDownloadSrc: rejectAsset,
    getAssetSrc: rejectAsset,
    restore: () => Promise.resolve(),
    upload: rejectAsset,
    validation: { maxFileSize: 5 * 1024 * 1024 },
  },
  flaggedExtensions: [],
  getEditorMetaData: () => ({ file_assets: [], user_mentions: [] }),
  id: "test-document-editor",
  mentionHandler: { renderComponent: () => null },
  value: "",
};

type RenderDocumentEditorOptions = {
  /** Initial document. Give blocks an `attrs.id` to address them with `selectBlock`. */
  content: Content;
  /** Overrides for any document editor prop (e.g. `editable`, handlers). */
  props?: Partial<IDocumentEditorProps>;
};

type TiptapDOM = HTMLElement & { editor?: Editor };

type DocumentEditorHarness = RenderResult & {
  user: UserEvent;
  /** Puts a NodeSelection on the block whose `id` attribute is `blockId`. */
  selectBlock: (blockId: string) => void;
  /** Puts a NodeSelection on the first node of type `typeName` (e.g. a node that carries no `id`). */
  selectNodeOfType: (typeName: string) => void;
  /** Clicks the drag handle, which opens the Block menu for the current selection. */
  openBlockMenu: () => Promise<void>;
};

/**
 * Renders the document editor (non-collaborative) and returns the steps a user takes to reach the
 * Block menu. jsdom has no layout, so the side menu never appears from hovering; instead a block is
 * selected the way a drag-handle click selects it, then the drag handle itself is clicked.
 */
export async function renderDocumentEditor({
  content,
  props,
}: RenderDocumentEditorOptions): Promise<DocumentEditorHarness> {
  const user = userEvent.setup();
  const result = render(<DocumentEditorWithRef {...defaultProps} {...props} value={content} />);

  const editorDOM = await waitFor(() => {
    const dom = result.container.querySelector<TiptapDOM>(".ProseMirror");
    if (!dom?.editor) throw new Error("Document editor did not mount");
    return dom;
  });
  const editor = editorDOM.editor!;

  const selectFirstNode = (matches: (node: ProseMirrorNode) => boolean, description: string) => {
    let nodePos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (nodePos !== null) return false;
      if (matches(node)) nodePos = pos;
      return nodePos === null;
    });
    if (nodePos === null) throw new Error(`No ${description}`);
    const pos = nodePos;
    act(() => {
      editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)));
    });
  };

  const selectBlock = (blockId: string) =>
    selectFirstNode((node) => node.attrs.id === blockId, `block with id "${blockId}"`);

  const selectNodeOfType = (typeName: string) =>
    selectFirstNode((node) => node.type.name === typeName, `node of type "${typeName}"`);

  const openBlockMenu = async () => {
    const dragHandle = result.container.querySelector<HTMLElement>("#drag-handle");
    if (!dragHandle) throw new Error("The side menu has no drag handle");
    await user.click(dragHandle);
  };

  return { ...result, user, selectBlock, selectNodeOfType, openBlockMenu };
}

/** The Block menu's items, by visible label. */
export const blockMenuItem = (label: string) => screen.queryByRole("button", { name: label });
