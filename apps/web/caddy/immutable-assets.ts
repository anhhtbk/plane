import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin, Rolldown } from "vite";

/** Only bundler-hashed client chunks qualify; copied/emitted assets remain mutable. */
export function caddyImmutableAssets(): Plugin {
  return {
    name: "caddy-immutable-assets",
    apply: "build",
    applyToEnvironment(environment) {
      return environment.config.consumer === "client";
    },
    async writeBundle(options, bundle) {
      if (this.environment.config.consumer !== "client") return;
      if (!options.dir) throw new Error("Caddy assets require a client output directory");

      const paths: string[] = [];
      for (const output of Object.values(bundle)) {
        // OutputAsset has no hash provenance field. Even a hash-looking filename
        // may have been supplied verbatim by a plugin or copied from public/.
        if (output.type !== "chunk") continue;
        const naming = output.isEntry ? options.entryFileNames : options.chunkFileNames;
        // React Router supplies a callback that derives route suffixes from
        // moduleIds. Pass only its pre-render contract, not post-render fields.
        const pattern =
          typeof naming === "function"
            ? naming({
                name: output.name,
                isEntry: output.isEntry,
                isDynamicEntry: output.isDynamicEntry,
                facadeModuleId: output.facadeModuleId ?? undefined,
                moduleIds: output.moduleIds,
                exports: output.exports,
              } satisfies Rolldown.PreRenderedChunk)
            : naming;
        if (typeof pattern !== "string" || !/\[hash(?::\d+)?\]/.test(pattern)) {
          throw new Error("Caddy immutable chunks require a naming pattern containing [hash]");
        }
        // Explicit fileName overrides never contain a bundler hash placeholder.
        if (output.preliminaryFileName === output.fileName) continue;
        if (!/\.(?:js|mjs|cjs)$/.test(output.fileName)) continue;
        if (!output.preliminaryFileName.includes("!~{")) continue;

        // No Caddy tokens, placeholders, globs, encoded paths or traversal.
        if (
          !/^[a-zA-Z0-9_./-]+$/.test(output.fileName) ||
          output.fileName.startsWith("/") ||
          output.fileName.split("/").some((part) => part === "" || part === "." || part === "..")
        ) {
          throw new Error(`Unsafe Caddy asset path: ${JSON.stringify(output.fileName)}`);
        }
        paths.push(`/${output.fileName}`);
      }
      if (paths.length === 0) throw new Error("No proven hashed client chunks for Caddy");

      // Response matching prevents immutable headers on a file-server error,
      // including a file removed between the existence check and serving it.
      const snippet = [
        "# Generated from client bundle hash metadata; do not edit.",
        "@immutable path " + paths.toSorted().join(" "),
        "header @immutable {",
        '\tCache-Control "public, max-age=31536000, immutable"',
        "\tmatch status 200 206 304",
        "}",
        "",
      ].join("\n");
      // Outside build/client, so the server never exposes the configuration.
      await writeFile(path.resolve(options.dir, "../caddy-assets.caddy"), snippet);
    },
  };
}
