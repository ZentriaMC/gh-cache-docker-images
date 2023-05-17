import { defineConfig } from "tsup";

export default defineConfig({
    entry: [
        "src/index.ts",
        "src/post-index.ts",
    ],
    target: "node16",
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    noExternal: [
        /@actions\/.*/
    ],
    treeshake: {
        annotations: true,
        moduleSideEffects: false,
    },
});
