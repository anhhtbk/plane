/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
// constants
import { CORE_EXTENSIONS } from "@/constants/extension";
// plugins
import { AIHandlePlugin } from "@/plugins/ai-handle";
import { DragHandlePlugin, nodeDOMAtCoords } from "@/plugins/drag-handle";

type Props = {
  aiEnabled: boolean;
  dragDropEnabled: boolean;
};

export type SideMenuExtensionStorage = {
  /**
   * Set by a Block menu that has something to offer while the editor is not editable (Copy link).
   * Only then does hovering a block in a read-only editor show the drag handle, which opens that
   * menu; it can't drag, and the AI handle stays hidden.
   */
  isReadOnlyMenuEnabled: boolean;
};

declare module "@tiptap/core" {
  interface Storage {
    [CORE_EXTENSIONS.SIDE_MENU]: SideMenuExtensionStorage;
  }
}

export type SideMenuPluginProps = {
  dragHandleWidth: number;
  handlesConfig: {
    ai: boolean;
    dragDrop: boolean;
  };
  scrollThreshold: {
    up: number;
    down: number;
  };
};

export type SideMenuHandleOptions = {
  view: (view: EditorView, sideMenu: HTMLDivElement | null) => void;
  domEvents?: {
    [key: string]: (...args: any) => void;
  };
};

export const SideMenuExtension = (props: Props) => {
  const { aiEnabled, dragDropEnabled } = props;

  return Extension.create<unknown, SideMenuExtensionStorage>({
    name: CORE_EXTENSIONS.SIDE_MENU,
    addStorage() {
      return {
        isReadOnlyMenuEnabled: false,
      };
    },
    addProseMirrorPlugins() {
      const storage = this.storage;
      return [
        SideMenu(
          {
            dragHandleWidth: 24,
            handlesConfig: {
              ai: aiEnabled,
              dragDrop: dragDropEnabled,
            },
            scrollThreshold: { up: 200, down: 150 },
          },
          () => storage.isReadOnlyMenuEnabled
        ),
      ];
    },
  });
};

const absoluteRect = (node: Element) => {
  const data = node.getBoundingClientRect();

  return {
    top: data.top,
    left: data.left,
    width: data.width,
  };
};

const SideMenu = (options: SideMenuPluginProps, isReadOnlyMenuEnabled: () => boolean) => {
  const { handlesConfig } = options;
  const editorSideMenu: HTMLDivElement | null = document.createElement("div");
  editorSideMenu.id = "editor-side-menu";
  // side menu view actions
  const hideSideMenu = () => {
    if (!editorSideMenu?.classList.contains("side-menu-hidden")) editorSideMenu?.classList.add("side-menu-hidden");
  };
  const showSideMenu = () => editorSideMenu?.classList.remove("side-menu-hidden");
  // side menu elements
  const { view: dragHandleView, domEvents: dragHandleDOMEvents } = DragHandlePlugin(options);
  const { view: aiHandleView, domEvents: aiHandleDOMEvents } = AIHandlePlugin(options);
  // A read-only editor shows no AI handle and cannot drag from the drag handle.
  let syncedEditable: boolean | null = null;
  const syncHandlesWithEditability = (view: EditorView) => {
    if (syncedEditable === view.editable) return;
    syncedEditable = view.editable;
    const aiHandle = editorSideMenu.querySelector<HTMLElement>("#ai-handle");
    if (aiHandle) aiHandle.style.display = view.editable ? "" : "none";
    const dragHandle = editorSideMenu.querySelector<HTMLElement>("#drag-handle");
    if (dragHandle) {
      dragHandle.draggable = view.editable;
      dragHandle.style.cursor = view.editable ? "" : "pointer";
    }
  };

  return new Plugin({
    key: new PluginKey("sideMenu"),
    view: (view) => {
      hideSideMenu();
      view?.dom.parentElement?.appendChild(editorSideMenu);
      // side menu elements' initialization
      if (handlesConfig.ai && !editorSideMenu.querySelector("#ai-handle")) {
        aiHandleView(view, editorSideMenu);
      }

      if (handlesConfig.dragDrop && !editorSideMenu.querySelector("#drag-handle")) {
        dragHandleView(view, editorSideMenu);
      }

      syncHandlesWithEditability(view);
      // Also cancels a drag forced past `draggable` (e.g. a synthetic dragstart). Capturing on the
      // side menu runs before the drag handle's own dragstart listener.
      const preventReadOnlyDrag = (event: DragEvent) => {
        if (view.editable) return;
        event.preventDefault();
        event.stopPropagation();
      };
      editorSideMenu.addEventListener("dragstart", preventReadOnlyDrag, true);

      return {
        update: (updatedView) => syncHandlesWithEditability(updatedView),
        destroy: () => {
          editorSideMenu.removeEventListener("dragstart", preventReadOnlyDrag, true);
          hideSideMenu();
        },
      };
    },
    props: {
      handleDOMEvents: {
        mousemove: (view, event) => {
          const isReadOnly = !view.editable;
          // Read-only: only the drag handle, and only when it opens a Block menu.
          if (isReadOnly && !(handlesConfig.dragDrop && isReadOnlyMenuEnabled())) return;
          const showAIHandle = handlesConfig.ai && !isReadOnly;

          const node = nodeDOMAtCoords({
            x: event.clientX + 50 + options.dragHandleWidth,
            y: event.clientY,
          });

          if (!(node instanceof Element) || node.matches("ul, ol")) {
            hideSideMenu();
            return;
          }

          const compStyle = window.getComputedStyle(node);
          const lineHeight = parseInt(compStyle.lineHeight, 10);
          const paddingTop = parseInt(compStyle.paddingTop, 10);

          const rect = absoluteRect(node);

          rect.top += (lineHeight - 20) / 2;
          rect.top += paddingTop;

          if (showAIHandle) {
            rect.left -= 20;
          }

          if (node.parentElement?.parentElement?.matches("td") || node.parentElement?.parentElement?.matches("th")) {
            if (node.matches("ul:not([data-type=taskList]) li, ol li")) {
              rect.left -= 5;
            }
          } else {
            // Li markers
            if (node.matches("ul:not([data-type=taskList]) li, ol li")) {
              rect.left -= 18;
            }
          }

          if (node.matches("table")) {
            rect.top += 8;
            rect.left -= 8;
          }

          rect.width = options.dragHandleWidth;

          if (!editorSideMenu) return;

          editorSideMenu.style.left = `${rect.left - rect.width}px`;
          editorSideMenu.style.top = `${rect.top}px`;
          showSideMenu();
          if (handlesConfig.dragDrop) {
            dragHandleDOMEvents?.mousemove();
          }
          if (showAIHandle) {
            aiHandleDOMEvents?.mousemove?.();
          }
        },
        // keydown: () => hideSideMenu(),
        mousewheel: () => hideSideMenu(),
        dragenter: (view) => {
          if (handlesConfig.dragDrop) {
            dragHandleDOMEvents?.dragenter?.(view);
          }
        },
        drop: (view, event) => {
          if (handlesConfig.dragDrop) {
            dragHandleDOMEvents?.drop?.(view, event);
          }
        },
        dragend: (view) => {
          if (handlesConfig.dragDrop) {
            dragHandleDOMEvents?.dragend?.(view);
          }
        },
      },
    },
  });
};
