import test from "node:test";
import assert from "node:assert/strict";
import { resolveAwaitingInfoAnomaly, resolveFirstContactAnomaly } from "../lib/admin-sla.js";

test("resolveFirstContactAnomaly should return null when request is not submitted", () => {
  const lead = {
    consultationRequest: { requestStatus: "qualified" },
    createdAt: "2026-04-18T00:00:00.000Z"
  };

  assert.equal(resolveFirstContactAnomaly(lead, { now: Date.parse("2026-04-18T03:00:00.000Z") }), null);
});

test("resolveFirstContactAnomaly should detect overtime when still pending", () => {
  const lead = {
    consultationRequest: {
      requestStatus: "submitted",
      submittedAt: "2026-04-18T00:00:00.000Z"
    },
    adminFollowUpRecord: {}
  };

  const anomaly = resolveFirstContactAnomaly(lead, {
    now: Date.parse("2026-04-18T03:00:00.000Z"),
    slaMinutes: 120
  });

  assert.equal(anomaly?.mode, "still_pending");
  assert.equal(anomaly?.overtimeMinutes, 60);
});

test("resolveFirstContactAnomaly should detect late first contact", () => {
  const lead = {
    consultationRequest: {
      requestStatus: "submitted",
      submittedAt: "2026-04-18T00:00:00.000Z"
    },
    adminFollowUpRecord: {
      firstContactAt: "2026-04-18T02:45:00.000Z"
    }
  };

  const anomaly = resolveFirstContactAnomaly(lead, { slaMinutes: 120 });

  assert.equal(anomaly?.mode, "contact_late");
  assert.equal(anomaly?.overtimeMinutes, 45);
});

test("resolveAwaitingInfoAnomaly should return null below threshold", () => {
  const lead = {
    v2Status: "awaiting_user_info",
    updatedAt: "2026-04-16T00:00:00.000Z",
    adminFollowUpRecord: {}
  };

  assert.equal(
    resolveAwaitingInfoAnomaly(lead, {
      now: Date.parse("2026-04-18T00:00:00.000Z"),
      thresholdDays: 7
    }),
    null
  );
});

test("resolveAwaitingInfoAnomaly should return anomaly over threshold", () => {
  const lead = {
    v2Status: "awaiting_user_info",
    updatedAt: "2026-04-08T00:00:00.000Z",
    adminFollowUpRecord: {}
  };

  const anomaly = resolveAwaitingInfoAnomaly(lead, {
    now: Date.parse("2026-04-18T00:00:00.000Z"),
    thresholdDays: 7
  });

  assert.equal(anomaly?.waitDays, 10);
});
