import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.ts";

test("documentation requests including queries use the asset binding", async () => {
  for (const path of ["/docs?ref=share", "/docs/", "/docs/missing?ref=share"]) {
    const request = new Request("https://wodge.amr21.dev" + path);
    const response = new Response("docs", { status: 404 });
    const actual = await worker.fetch(request, {
      ASSETS: {
        fetch: (received) => {
          assert.equal(received, request);
          return response;
        },
      },
      WEB: {
        fetch: () =>
          assert.fail("Docs requests must not reach app authentication"),
      },
    });
    assert.equal(actual, response);
  }
});

test("other prefix matches preserve the original application request and response", async () => {
  const request = new Request("https://wodge.amr21.dev/docsmith?tab=settings", {
    method: "POST",
    headers: { cookie: "test=session" },
    body: "test payload",
  });
  const response = new Response(null, {
    status: 307,
    headers: { location: "/login" },
  });
  const actual = await worker.fetch(request, {
    ASSETS: {
      fetch: () => assert.fail("Application paths must not reach docs assets"),
    },
    WEB: {
      fetch: async (received) => {
        assert.equal(received, request);
        assert.equal(received.headers.get("cookie"), "test=session");
        assert.equal(await received.text(), "test payload");
        return response;
      },
    },
  });
  assert.equal(actual, response);
});
