import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "site");
const output = resolve(root, "site-dist");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const minifiedSize = Math.round((await stat(resolve(root, "dist/yellow-vsl.min.js"))).size / 1024);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
await cp(resolve(root, "dist/yellow-vsl.min.js"), resolve(output, "yellow-vsl.min.js"));

for (const filename of ["index.html", "app.js", "i18n.js", "styles.css"]) {
  const path = resolve(output, filename);
  const content = await readFile(path, "utf8");
  await writeFile(path, content
    .replaceAll("__VERSION__", pkg.version)
    .replaceAll("__SIZE__", String(minifiedSize)));
}

console.log(`YellowVSL site v${pkg.version} built in ${output}`);
