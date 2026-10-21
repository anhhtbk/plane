/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      // Mirrors the `@/*` path in tsconfig.json.
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      // prosemirror-codemark has no `exports`, so tests would load its CJS build, which requires a
      // second copy of prosemirror-state whose unkeyed plugins collide with the ESM copy's
      // ("Adding different instances of a keyed plugin"). Point it at its ESM build instead.
      { find: /^prosemirror-codemark$/, replacement: "prosemirror-codemark/dist/esm/index.js" },
    ],
  },
  test: {
    // Component tests that need a DOM but not a real browser, so `pnpm test` stays runnable
    // without browsers.
    include: ["src/**/*.test.tsx"],
    environment: "jsdom",
    setupFiles: ["./vitest.setup.dom.ts"],
    // Node 25+ ships its own `localStorage` global, which shadows jsdom's and is undefined without
    // `--localstorage-file`; `@plane/i18n` reads it on import.
    execArgv: ["--no-experimental-webstorage"],
    // The ESM build above uses extensionless relative imports, which only Vite can resolve.
    server: { deps: { inline: ["prosemirror-codemark"] } },
  },
});
