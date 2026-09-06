import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import packageInfo from "../../package.json" with { type: "json" };
import { version } from "../../src/index.js";

test("package, public API and distributed banners have the same version", async () => {
  assert.equal(version, packageInfo.version);
  for (const file of ["yellow-vsl.js", "yellow-vsl.min.js", "yellow-vsl.esm.js"]) {
    const content = await readFile(new URL(`../../dist/${file}`, import.meta.url), "utf8");
    assert.ok(content.startsWith(`/*! YellowVSL v${packageInfo.version} |`));
  }
  const esm = await import("../../dist/yellow-vsl.esm.js");
  assert.equal(esm.version, packageInfo.version);
});
