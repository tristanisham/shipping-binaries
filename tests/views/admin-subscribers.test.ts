import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import {
  AdminSubscribers,
  formatSubscriptionDuration,
} from "../../src/views/AdminSubscribers.js";

test("subscriber durations use the largest meaningful unit", () => {
  const now = Date.parse("2026-07-30T12:00:00.000Z");
  assert.equal(
    formatSubscriptionDuration("2026-07-28 12:00:00", now),
    "2 days",
  );
  assert.equal(
    formatSubscriptionDuration("2026-07-30 11:59:45", now),
    "less than a minute",
  );
});

test("subscriber page renders date, duration, mail, and unsubscribe actions", () => {
  const html = renderToString(
    AdminSubscribers({
      now: Date.parse("2026-07-30T12:00:00.000Z"),
      subscribers: [
        {
          confirmationSentAt: "2026-07-28 12:00:00",
          confirmedAt: "2026-07-28 12:00:00",
          createdAt: "2026-07-28 11:59:00",
          email: "reader@example.com",
          id: 7,
          unsubscribedAt: null,
          updatedAt: "2026-07-28 12:00:00",
          userId: null,
        },
      ],
      viewerUsername: "owner",
    }),
  );

  assert.match(html, /Jul 28, 2026 \(2 days\)/);
  assert.match(html, /href="mailto:reader@example\.com"/);
  assert.match(html, /action="\/admin\/subscribers\/7\/unsubscribe"/);
});
