import assert from "node:assert/strict";
import { test } from "node:test";
import { withD1Retry } from "../../src/models/d1.js";

const transientError = () =>
  new Error(
    "D1_ERROR: Internal error while starting up D1 DB storage caused object to be reset",
  );

test("withD1Retry returns the result without retrying on success", async () => {
  let calls = 0;
  const result = await withD1Retry(() => {
    calls += 1;
    return Promise.resolve("ok");
  });

  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("withD1Retry re-runs a transient storage reset and then succeeds", async () => {
  let calls = 0;
  const result = await withD1Retry(() => {
    calls += 1;
    if (calls < 3) {
      return Promise.reject(transientError());
    }
    return Promise.resolve("recovered");
  });

  assert.equal(result, "recovered");
  assert.equal(calls, 3);
});

test("withD1Retry gives up after the attempt limit", async () => {
  let calls = 0;
  await assert.rejects(
    withD1Retry(() => {
      calls += 1;
      return Promise.reject(transientError());
    }),
    /caused object to be reset/,
  );

  assert.equal(calls, 3);
});

test("withD1Retry does not retry a genuine SQL error", async () => {
  let calls = 0;
  await assert.rejects(
    withD1Retry(() => {
      calls += 1;
      return Promise.reject(new Error("D1_ERROR: no such column: bogus"));
    }),
    /no such column/,
  );

  assert.equal(calls, 1);
});
