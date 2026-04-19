import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "db.json");

async function withDbBackup(run) {
  const backup = await fs.readFile(dbPath, "utf8");

  try {
    await run();
  } finally {
    await fs.writeFile(dbPath, backup, "utf8");
  }
}

function buildMockLead({ leadId, nowIso, initialStatus = "admin_following" }) {
  const legacyStatusMap = {
    admin_following: "跟进中",
    nurturing: "暂不跟进",
    closed: "已关闭"
  };

  return {
    id: leadId,
    createdAt: nowIso,
    created_at: nowIso,
    updatedAt: nowIso,
    updated_at: nowIso,
    userId: "transition-user",
    user_id: "transition-user",
    status: legacyStatusMap[initialStatus] || "跟进中",
    assignedConsultantId: null,
    assigned_consultant_id: null,
    sourceChannel: "direct",
    effectiveChannel: "direct",
    channelLabel: "自然流量",
    priority: "中",
    grade: "B",
    assignment: {
      consultantId: null,
      consultantName: "待确认",
      focusLabel: "综合规划",
      reason: "状态流转测试"
    },
    answers: {
      contactName: "状态测试家长",
      studentName: "状态测试学生",
      grade: "g7-g9",
      sourceChannel: "direct"
    },
    result: {
      overview: "状态流转测试",
      primaryPathLabel: "测试路径",
      scores: {
        grade: "B",
        priority: "中"
      }
    },
    caseRecord: {
      status: initialStatus,
      createdAt: nowIso,
      updatedAt: nowIso,
      closure:
        initialStatus === "closed"
          ? {
              reason: "completed_plan",
              note: "已成交",
              closedAt: nowIso,
              updatedAt: nowIso
            }
          : {}
    },
    consultationRequest: {
      requestStatus: "submitted",
      submittedAt: nowIso
    },
    adminFollowUpRecord: {
      status: initialStatus,
      updatedAt: nowIso,
      followUpNotes: []
    },
    followUps: [
      {
        id: crypto.randomUUID(),
        createdAt: nowIso,
        author: "顾问",
        note: "已完成首次沟通。"
      }
    ]
  };
}

test("transitionCaseStatus should sync main and sub statuses when moving to nurturing", async () => {
  await withDbBackup(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.SUPABASE_URL = "";
    process.env.SUPABASE_SECRET_KEY = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";

    const { readDb, writeDb, getLead, transitionCaseStatus } = await import("../lib/data.js");
    const db = await readDb();
    const nowIso = new Date().toISOString();
    const leadId = `transition-sync-${Date.now()}`;

    db.leads.unshift(
      buildMockLead({
        leadId,
        nowIso,
        initialStatus: "admin_following"
      })
    );

    await writeDb(db);

    const updated = await transitionCaseStatus({
      leadId,
      newStatus: "nurturing",
      actorId: "系统联调",
      metadata: {
        reason: "预算窗口不匹配",
        nextAction: "3 周后回访",
        note: "转入资源库"
      }
    });

    assert.equal(updated.status, "暂不跟进");
    assert.equal(updated.caseRecord?.status, "nurturing");
    assert.equal(updated.adminFollowUpRecord?.status, "nurturing");

    const refreshed = await getLead(leadId);
    assert.equal(refreshed.lead?.status, "暂不跟进");
    assert.equal(refreshed.lead?.caseRecord?.status, "nurturing");
    assert.equal(refreshed.lead?.adminFollowUpRecord?.status, "nurturing");
  });
});

test("transitionCaseStatus should require reopenReason when reopening closed case", async () => {
  await withDbBackup(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.SUPABASE_URL = "";
    process.env.SUPABASE_SECRET_KEY = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";

    const { readDb, writeDb, getLead, transitionCaseStatus } = await import("../lib/data.js");
    const db = await readDb();
    const nowIso = new Date().toISOString();
    const leadId = `transition-reopen-${Date.now()}`;

    db.leads.unshift(
      buildMockLead({
        leadId,
        nowIso,
        initialStatus: "closed"
      })
    );

    await writeDb(db);

    await assert.rejects(
      () =>
        transitionCaseStatus({
          leadId,
          newStatus: "admin_following",
          actorId: "系统联调"
        }),
      /重新激活原因/
    );

    const reopened = await transitionCaseStatus({
      leadId,
      newStatus: "admin_following",
      actorId: "系统联调",
      metadata: {
        reopenReason: "用户主动回访，需重新推进",
        note: "已重新激活"
      }
    });

    assert.equal(reopened.status, "跟进中");
    assert.equal(reopened.caseRecord?.status, "admin_following");
    assert.equal(reopened.adminFollowUpRecord?.status, "admin_following");

    const refreshed = await getLead(leadId);
    assert.equal(refreshed.lead?.status, "跟进中");
    assert.equal(refreshed.lead?.caseRecord?.status, "admin_following");
    assert.equal(refreshed.lead?.adminFollowUpRecord?.status, "admin_following");
  });
});
