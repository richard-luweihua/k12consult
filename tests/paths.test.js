import test from "node:test";
import assert from "node:assert/strict";
import { absoluteAppUrl } from "../lib/paths.js";

test("absoluteAppUrl should follow request origin by default", () => {
  const url = absoluteAppUrl("/advisor/workbench", {
    url: "http://127.0.0.1:3003/api/auth/advisor/register",
    headers: new Headers()
  });

  assert.equal(url.toString(), "http://127.0.0.1:3003/advisor/workbench");
});

test("absoluteAppUrl should prioritize origin header when present", () => {
  const headers = new Headers({
    origin: "http://localhost:3003",
    host: "localhost:3000"
  });
  const url = absoluteAppUrl("/advisor/workbench", {
    url: "http://localhost:3000/api/auth/advisor/register",
    headers
  });

  assert.equal(url.toString(), "http://localhost:3003/advisor/workbench");
});

test("absoluteAppUrl should prioritize NEXT_PUBLIC_SITE_URL when configured", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://k12.example.com/base";

  try {
    const url = absoluteAppUrl("/advisor/workbench", {
      url: "http://localhost:3000/api/auth/advisor/register",
      headers: new Headers({
        origin: "http://localhost:3003",
        host: "localhost:3000"
      })
    });

    assert.equal(url.toString(), "https://k12.example.com/advisor/workbench");
  } finally {
    process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});
