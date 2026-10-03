import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { build } from "vite";
import { caddyImmutableAssets } from "./immutable-assets";

let root: string;
beforeEach(async () => {
  // macOS's /var alias otherwise confuses Vite's HTML output-relative path.
  root = await realpath(await mkdtemp(path.join(tmpdir(), "caddy-assets-test-")));
  await mkdir(path.join(root, "public"));
  await writeFile(path.join(root, "index.html"), '<script type="module" src="/main.js"></script>');
  await writeFile(path.join(root, "main.js"), 'import "./style.css"; globalThis.load = () => import("./lazy.js");');
  await writeFile(path.join(root, "lazy.js"), 'export const value = "lazy-loaded";');
  await writeFile(path.join(root, "fixed.js"), 'export const value = "fixed-name";');
  await writeFile(path.join(root, "style.css"), "body { color: red }");
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("Caddy immutable provenance", () => {
  it.each(["string", "function"] as const)(
    "allows proven entry/lazy chunks with %s naming, excluding uncertain outputs",
    async (naming) => {
      await writeFile(path.join(root, "public/workbox-9f2f79cf.js"), "/* mutable public copy */");
      const result = await build({
        root,
        configFile: false,
        logLevel: "silent",
        build: {
          outDir: "build/client",
          rollupOptions: {
            output: {
              entryFileNames:
                naming === "string"
                  ? "assets/[name]-[hash].js"
                  : ({ moduleIds }) => {
                      // Like React Router, derive the suffix from pre-render module IDs.
                      const suffix = moduleIds.some((id) => id.endsWith("/main.js")) ? "-route" : "";
                      return `assets/[name]${suffix}-[hash].js`;
                    },
              chunkFileNames:
                naming === "string"
                  ? "assets/[name]-[hash].js"
                  : ({ isDynamicEntry }) => `assets/[name]${isDynamicEntry ? "-lazy" : ""}-[hash].js`,
            },
          },
        },
        plugins: [
          {
            name: "fixed-name-emissions",
            buildStart() {
              this.emitFile({ type: "asset", name: "fake.js", fileName: "assets/fake-12345678.js", source: "mutable" });
              this.emitFile({ type: "chunk", id: path.join(root, "fixed.js"), fileName: "assets/fixed-12345678.js" });
            },
          },
          caddyImmutableAssets(),
        ],
      });
      if (Array.isArray(result) || !("output" in result)) throw new Error("Expected one bundle");
      const snippet = await readFile(path.join(root, "build/caddy-assets.caddy"), "utf8");
      const allowed = snippet.split("\n")[1].replace("@immutable path ", "").split(" ");
      const hashedChunks = result.output.filter(
        (output) => output.type === "chunk" && output.fileName !== "assets/fixed-12345678.js"
      );
      expect(hashedChunks.some((output) => output.type === "chunk" && output.isDynamicEntry)).toBe(true);
      expect(allowed).toEqual(hashedChunks.map((output) => `/${output.fileName}`).toSorted());
      if (naming === "function") {
        expect(allowed.some((file) => /-route-[^/]+[.]js$/.test(file))).toBe(true);
        expect(allowed.some((file) => /-lazy-[^/]+[.]js$/.test(file))).toBe(true);
      }
      expect(allowed).not.toContain("/workbox-9f2f79cf.js");
      expect(allowed).not.toContain("/assets/fake-12345678.js");
      expect(allowed).not.toContain("/assets/fixed-12345678.js");
      expect(allowed).not.toContain("/index.html");
      const css = result.output.find((output) => output.type === "asset" && output.fileName.endsWith(".css"));
      if (!css) throw new Error("Expected real emitted CSS");
      expect(allowed).not.toContain(`/${css.fileName}`);
      await expect(readFile(path.join(root, "build/client/caddy-assets.caddy"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    }
  );

  it.each(["string", "function"] as const)("fails when %s naming drops [hash]", async (naming) => {
    await expect(
      build({
        root,
        configFile: false,
        logLevel: "silent",
        build: {
          outDir: "build/client",
          rollupOptions: {
            output: { entryFileNames: naming === "string" ? "assets/[name].js" : () => "assets/[name].js" },
          },
        },
        plugins: [caddyImmutableAssets()],
      })
    ).rejects.toThrow("naming pattern containing [hash]");
  });

  it.each(["assets/evil{header}-[hash].js", "assets/evil%2fpath-[hash].js", "assets/evil*-[hash].js"])(
    "rejects unsafe Caddy path %s",
    async (entryFileNames) => {
      await expect(
        build({
          root,
          configFile: false,
          logLevel: "silent",
          build: { outDir: "build/client", rollupOptions: { output: { entryFileNames } } },
          plugins: [caddyImmutableAssets()],
        })
      ).rejects.toThrow("Unsafe Caddy asset path");
    }
  );

  it("does not emit a snippet for server builds", async () => {
    await build({
      root,
      configFile: false,
      logLevel: "silent",
      build: { outDir: "build/server", ssr: path.join(root, "lazy.js") },
      plugins: [caddyImmutableAssets()],
    });
    await expect(readFile(path.join(root, "build/caddy-assets.caddy"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
