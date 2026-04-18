import { NextResponse } from "next/server";
import { getLead, updateLead } from "../../../../../lib/data.js";
import { canActorViewLead, resolveActorFromRequest, sanitizeLeadForActor } from "../../../../../lib/lead-access";

function resolveCurrentV2Status(lead) {
  return lead.caseRecord?.status || lead.adminFollowUpRecord?.status || "report_viewed";
}

function normalizeProvidedItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export async function POST(request, { params }) {
  try {
    const actor = await resolveActorFromRequest(request);

    if (!actor.role) {
      return NextResponse.json({ ok: false, message: "请先登录后再补充资料。" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const resolvedParams = await params;
    const bundle = await getLead(resolvedParams.submissionId);

    if (!bundle.lead) {
      return NextResponse.json({ ok: false, message: "案例不存在。" }, { status: 404 });
    }

    const lead = bundle.lead;

    if (!canActorViewLead(actor, lead)) {
      return NextResponse.json({ ok: false, message: "你没有权限补充这个案例的资料。" }, { status: 403 });
    }

    const currentV2Status = resolveCurrentV2Status(lead);

    if (currentV2Status !== "awaiting_user_info") {
      return NextResponse.json({ ok: false, message: "当前状态不需要补资料，请联系管理员确认。" }, { status: 409 });
    }

    const providedItems = normalizeProvidedItems(body.providedItems);
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (providedItems.length === 0 && !notes) {
      return NextResponse.json({ ok: false, message: "请至少勾选一项已补资料或填写补充说明。" }, { status: 400 });
    }

    const notePrefix = providedItems.length > 0 ? `已补资料：${providedItems.join("、")}` : "已提交补充说明";
    const followUpNote = notes ? `${notePrefix}\n补充说明：${notes}` : notePrefix;
    const updatedLead = await updateLead(lead.id, {
      submitSupplementalInfo: true,
      supplementalInfoProvided: providedItems,
      supplementalInfoNotes: notes,
      followUpAuthor: "用户",
      followUpNote
    });

    if (!updatedLead) {
      return NextResponse.json({ ok: false, message: "案例不存在。" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      lead: sanitizeLeadForActor(actor, updatedLead)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交补资料失败";

    if (message.includes("不支持的状态流转")) {
      return NextResponse.json({ ok: false, message }, { status: 409 });
    }

    return NextResponse.json(
      {
        ok: false,
        message
      },
      { status: 500 }
    );
  }
}
