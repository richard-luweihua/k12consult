import test from "node:test";
import assert from "node:assert/strict";
import {
  ValidationError,
  assertCaseTransitionAllowed,
  assertCaseTransitionRequirements,
  normalizeV2Status,
  consultantAllowedV2Statuses
} from "../lib/case-flow.js";

test("normalizeV2Status should normalize legacy aliases", () => {
  assert.equal(normalizeV2Status("consult_scheduled"), "follow_up");
  assert.equal(normalizeV2Status("consult_completed"), "follow_up");
  assert.equal(normalizeV2Status("converted"), "closed");
  assert.equal(normalizeV2Status("report_view_pending"), "report_viewed");
  assert.equal(normalizeV2Status("submitted_pending_review"), "consult_intent_submitted");
});

test("assertCaseTransitionAllowed should enforce new advisor flow", () => {
  assert.doesNotThrow(() => assertCaseTransitionAllowed("consult_assigned", "follow_up"));
  assert.doesNotThrow(() => assertCaseTransitionAllowed("follow_up", "closed"));
  assert.doesNotThrow(() => assertCaseTransitionAllowed("follow_up", "nurturing"));
  assert.throws(() => assertCaseTransitionAllowed("consult_assigned", "closed"), ValidationError);
});

test("assertCaseTransitionRequirements should require closeReason for closed", () => {
  assert.throws(
    () =>
      assertCaseTransitionRequirements({
        nextStatus: "closed",
        payload: {},
        currentCaseRecord: {}
      }),
    ValidationError
  );

  assert.doesNotThrow(() =>
    assertCaseTransitionRequirements({
      nextStatus: "closed",
      payload: { closeReason: "成交签约" },
      currentCaseRecord: {}
    })
  );
});

test("assertCaseTransitionRequirements should require assigned consultant before consult_assigned", () => {
  assert.throws(
    () =>
      assertCaseTransitionRequirements({
        nextStatus: "consult_assigned",
        payload: {},
        currentCaseRecord: {}
      }),
    ValidationError
  );

  assert.doesNotThrow(() =>
    assertCaseTransitionRequirements({
      nextStatus: "consult_assigned",
      payload: { assignedConsultantId: "advisor-001" },
      currentCaseRecord: {}
    })
  );
});

test("assertCaseTransitionRequirements should require at least one follow-up before follow_up", () => {
  assert.throws(
    () =>
      assertCaseTransitionRequirements({
        nextStatus: "follow_up",
        payload: {},
        currentCaseRecord: {}
      }),
    ValidationError
  );

  assert.throws(
    () =>
      assertCaseTransitionRequirements({
        nextStatus: "follow_up",
        payload: {
          existingFollowUps: [{ id: "f0", author: "系统", note: "自动建档" }]
        },
        currentCaseRecord: {}
      }),
    ValidationError
  );

  assert.doesNotThrow(() =>
    assertCaseTransitionRequirements({
      nextStatus: "follow_up",
      payload: {
        existingFollowUps: [{ id: "f1", author: "Ryan", note: "已和家长确认首咨时间" }]
      },
      currentCaseRecord: {}
    })
  );

  assert.doesNotThrow(() =>
    assertCaseTransitionRequirements({
      nextStatus: "follow_up",
      payload: {
        followUpNote: "首次接单跟进"
      },
      currentCaseRecord: {}
    })
  );
});

test("assertCaseTransitionRequirements should require nurturing reason and next action", () => {
  assert.throws(
    () =>
      assertCaseTransitionRequirements({
        nextStatus: "nurturing",
        payload: {},
        currentCaseRecord: {}
      }),
    ValidationError
  );

  assert.throws(
    () =>
      assertCaseTransitionRequirements({
        nextStatus: "nurturing",
        payload: { nurturingReason: "预算暂不匹配" },
        currentCaseRecord: {}
      }),
    ValidationError
  );

  assert.doesNotThrow(() =>
    assertCaseTransitionRequirements({
      nextStatus: "nurturing",
      payload: {
        nurturingReason: "预算暂不匹配",
        nurturingNextAction: "3周后回访"
      },
      currentCaseRecord: {}
    })
  );
});

test("consultant allowed statuses should match doc flow", () => {
  assert.deepEqual([...consultantAllowedV2Statuses].sort(), ["closed", "consult_assigned", "follow_up", "nurturing"].sort());
  assert.equal(consultantAllowedV2Statuses.has("consult_scheduled"), false);
  assert.equal(consultantAllowedV2Statuses.has("consult_completed"), false);
});
