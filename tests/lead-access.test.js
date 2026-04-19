import test from "node:test";
import assert from "node:assert/strict";
import { canActorViewLead } from "../lib/lead-access.js";

test("consultant should view assigned lead", () => {
  const actor = {
    role: "consultant",
    consultantKey: "consultant-ava",
    userId: "user-a"
  };
  const lead = {
    assignedConsultantId: "consultant-ava",
    userId: "user-b"
  };

  assert.equal(canActorViewLead(actor, lead), true);
});

test("consultant should view own submitted lead even if not assigned to self", () => {
  const actor = {
    role: "consultant",
    consultantKey: "consultant-ava",
    userId: "user-a"
  };
  const lead = {
    assignedConsultantId: "consultant-ryan",
    userId: "user-a"
  };

  assert.equal(canActorViewLead(actor, lead), true);
});

test("consultant should not view unassigned lead from other owner", () => {
  const actor = {
    role: "consultant",
    consultantKey: "consultant-ava",
    userId: "user-a"
  };
  const lead = {
    assignedConsultantId: "consultant-ryan",
    userId: "user-b"
  };

  assert.equal(canActorViewLead(actor, lead), false);
});
