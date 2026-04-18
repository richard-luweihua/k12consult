import test from "node:test";
import assert from "node:assert/strict";
import {
  ValidationError,
  normalizeConsultantPayload,
  filterAdminCases
} from "../lib/admin-service.js";

test("normalizeConsultantPayload should validate required fields for create", () => {
  assert.throws(() => normalizeConsultantPayload({}, { partial: false }), ValidationError);

  const normalized = normalizeConsultantPayload(
    {
      name: "顾问A",
      email: "a@example.com",
      mobile: "13800138000",
      title: "高级顾问",
      specialties: ["international", "conversion"],
      gradeFocus: ["G6", "G7"],
      capacityDaily: 3,
      capacityActive: 10,
      status: "active",
      priorityWeight: 80
    },
    { partial: false }
  );

  assert.equal(normalized.name, "顾问A");
  assert.equal(normalized.email, "a@example.com");
  assert.equal(normalized.status, "active");
  assert.deepEqual(normalized.specialties, ["international", "conversion"]);
});

test("normalizeConsultantPayload should allow partial update and normalize arrays", () => {
  const normalized = normalizeConsultantPayload(
    {
      specialties: "international, conversion , ",
      gradeFocus: ["G8", "", "G9"],
      status: "on_leave"
    },
    { partial: true }
  );

  assert.deepEqual(normalized.specialties, ["international", "conversion"]);
  assert.deepEqual(normalized.gradeFocus, ["G8", "G9"]);
  assert.equal(normalized.status, "on_leave");
});

test("filterAdminCases should filter by status, assignment and consultant", () => {
  const leads = [
    {
      id: "l1",
      v2Status: "report_viewed",
      assignment: { consultantId: null },
      assignedConsultantId: null,
      adminFollowUpRecord: { intentLevel: "high", budgetLevel: "international" }
    },
    {
      id: "l2",
      v2Status: "consult_assigned",
      assignment: { consultantId: "c-1" },
      assignedConsultantId: "c-1",
      adminFollowUpRecord: { intentLevel: "medium", budgetLevel: "medium_private" }
    },
    {
      id: "l3",
      v2Status: "follow_up",
      assignment: { consultantId: "c-2" },
      assignedConsultantId: "c-2",
      adminFollowUpRecord: { intentLevel: "high", budgetLevel: "international" }
    }
  ];

  const byStatus = filterAdminCases(leads, { v2Status: "follow_up" });
  assert.deepEqual(byStatus.map((item) => item.id), ["l3"]);

  const unassigned = filterAdminCases(leads, { assigned: "false" });
  assert.deepEqual(unassigned.map((item) => item.id), ["l1"]);

  const consultant = filterAdminCases(leads, { consultantId: "c-1" });
  assert.deepEqual(consultant.map((item) => item.id), ["l2"]);
});

test("filterAdminCases should support intent and budget filters", () => {
  const leads = [
    {
      id: "l1",
      v2Status: "admin_following",
      assignment: { consultantId: null },
      adminFollowUpRecord: { intentLevel: "high", budgetLevel: "international" }
    },
    {
      id: "l2",
      v2Status: "admin_following",
      assignment: { consultantId: null },
      adminFollowUpRecord: { intentLevel: "low", budgetLevel: "local_oriented" }
    }
  ];

  const filtered = filterAdminCases(leads, {
    intentLevel: "high",
    budgetLevel: "international"
  });

  assert.deepEqual(filtered.map((item) => item.id), ["l1"]);
});
