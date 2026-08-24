import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });

const shared = {
  bundle: true,
  target: ["es2020"],
  legalComments: "eof",
  sourcemap: true,
  banner: {
    js: "/*! YellowVSL v1.1.0 | MIT License | https://github.com/dvygolov/yellow-vsl */"
  }
};

await Promise.all([
  build({ ...shared, entryPoints: ["src/iife.js"], outfile: "dist/yellow-vsl.js", format: "iife" }),
  build({ ...shared, entryPoints: ["src/iife.js"], outfile: "dist/yellow-vsl.min.js", format: "iife", minify: true }),
  build({ ...shared, entryPoints: ["src/index.js"], outfile: "dist/yellow-vsl.esm.js", format: "esm" })
]);
