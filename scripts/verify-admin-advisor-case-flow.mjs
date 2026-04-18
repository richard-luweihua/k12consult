#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "db.json");

function logStep(ok, title, detail = "") {
  const icon = ok ? "PASS" : "FAIL";
  console.log(`[${icon}] ${title}${detail ? ` -> ${detail}` : ""}`);
}

function fail(message) {
  throw new Error(message);
}

async function expectReject(title, fn, expectContains = "") {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (expectContains && !message.includes(expectContains)) {
      fail(`${title} 返回了错误，但不符合预期: ${message}`);
    }

    logStep(true, title, message);
    return;
  }

  fail(`${title} 未按预期失败`);
}

async function expectPass(title, fn) {
  await fn();
  logStep(true, title);
}

async function main() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "";
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_SECRET_KEY = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";

  const backup = await fs.readFile(dbPath, "utf8");
  const { readDb, writeDb, updateLead, getLead } = await import("../lib/data.js");
  const now = new Date().toISOString();
  const leadId = `verify-case-flow-${Date.now()}`;

  try {
    const db = await readDb();
    const consultant = db.consultants?.[0];

    if (!consultant) {
      fail("缺少顾问数据，无法执行流程验证。");
    }

    db.leads.unshift({
      id: leadId,
      createdAt: now,
      created_at: now,
      updatedAt: now,
      updated_at: now,
      userId: "verify-user",
      user_id: "verify-user",
      status: "待派单",
      assignedConsultantId: null,
      assigned_consultant_id: null,
      sourceChannel: "direct",
      effectiveChannel: "direct",
      channelLabel: "自然流量",
      priority: "高",
      grade: "A",
      assignment: {
        consultantId: null,
        consultantName: "待确认",
        focusLabel: "综合规划",
        reason: "验证流程用案例"
      },
      answers: {
        contactName: "流程验证家长",
        studentName: "流程验证学生",
        grade: "A",
        location: "香港",
        sourceChannel: "direct"
      },
      result: {
        overview: "流程验证用案例",
        primaryPathLabel: "验证路径",
        scores: {
          grade: "A",
          priority: "高"
        }
      },
      caseRecord: {
        status: "consult_ready_for_assignment",
        assignedConsultantId: null,
        assignedConsultantName: "待确认",
        recommendedConsultantId: consultant.id,
        recommendedConsultantName: consultant.name,
        createdAt: now
      },
      consultationRequest: {
        requestStatus: "qualified",
        submittedAt: now
      },
      adminFollowUpRecord: {
        status: "consult_ready_for_assignment",
        updatedAt: now,
        followUpNotes: []
      },
      followUps: []
    });

    await writeDb(db);

    await expectReject(
      "未指定顾问不能进入 consult_assigned",
      () =>
        updateLead(leadId, {
          v2Status: "consult_assigned"
        }),
      "必须先指定顾问"
    );

    await expectPass("指定顾问后可进入 consult_assigned", () =>
      updateLead(leadId, {
        assignedConsultantId: consultant.id,
        v2Status: "consult_assigned"
      })
    );

    await expectReject(
      "consult_assigned 不能直接成交关闭",
      () =>
        updateLead(leadId, {
          v2Status: "closed",
          closeReason: "completed_plan"
        }),
      "不支持的状态流转"
    );

    await expectReject(
      "进入 follow_up 前需要至少 1 条跟进记录",
      () =>
        updateLead(leadId, {
          v2Status: "follow_up"
        }),
      "至少需要 1 条顾问跟进记录"
    );

    await expectPass("带跟进备注后可进入 follow_up", () =>
      updateLead(leadId, {
        v2Status: "follow_up",
        followUpAuthor: "系统联调",
        followUpNote: "已完成首次跟进。"
      })
    );

    await expectReject(
      "转 nurturing 必须填写未成交原因和后续动作",
      () =>
        updateLead(leadId, {
          v2Status: "nurturing"
        }),
      "未成交原因"
    );

    await expectPass("填写完整字段后可转 nurturing", () =>
      updateLead(leadId, {
        v2Status: "nurturing",
        nurturingReason: "预算窗口不匹配",
        nurturingNextAction: "3 周后回访"
      })
    );

    await expectPass("资源库案例可重新激活到 admin_following", () =>
      updateLead(leadId, {
        v2Status: "admin_following",
        followUpAuthor: "系统联调",
        followUpNote: "管理员已重新激活。"
      })
    );

    await expectPass("重新评估进入 consult_ready_for_assignment", () =>
      updateLead(leadId, {
        v2Status: "consult_ready_for_assignment",
        followUpAuthor: "系统联调",
        followUpNote: "已满足再次派单条件。"
      })
    );

    await expectPass("重新推进到 consult_assigned", () =>
      updateLead(leadId, {
        assignedConsultantId: consultant.id,
        v2Status: "consult_assigned"
      })
    );

    await expectPass("再次进入 follow_up", () =>
      updateLead(leadId, {
        v2Status: "follow_up",
        followUpAuthor: "系统联调",
        followUpNote: "进入成交收口阶段。"
      })
    );

    await expectPass("填写成交结论后可 closed", () =>
      updateLead(leadId, {
        v2Status: "closed",
        closeReason: "completed_plan",
        closeNote: "已成交签约"
      })
    );

    const refreshed = await getLead(leadId);
    const finalStatus = refreshed.lead?.caseRecord?.status;

    if (finalStatus !== "closed") {
      fail(`最终状态异常，期望 closed，实际 ${finalStatus || "null"}`);
    }

    logStep(true, "最终状态校验", "closed");
    console.log("[DONE] 管理员/顾问主流程联调通过。");
  } finally {
    await fs.writeFile(dbPath, backup, "utf8");
    logStep(true, "测试数据回滚", "data/db.json 已恢复");
  }
}

main().catch((error) => {
  console.error(`[FAILED] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
