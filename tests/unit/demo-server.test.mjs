import test from "node:test";
import assert from "node:assert/strict";
import { startDemoServer } from "../../demo/server.mjs";

test("локальный demo-сервер отдаёт стенд по HTTP и перенаправляет корень", async (context) => {
  const { server, url } = await startDemoServer({ port: 0, openBrowser: false });
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const origin = new URL(url).origin;
  const redirect = await fetch(`${origin}/`, { redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "/demo/");

  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  const html = await response.text();
  assert.match(html, /YellowVSL Feature Lab/);
  assert.match(html, /\.\.\/dist\/yellow-vsl\.js/);
  assert.match(html, /demo\\start-demo\.cmd/);
});
