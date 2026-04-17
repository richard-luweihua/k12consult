import { NextResponse } from "next/server";
import { getLead, updateLead } from "../../../../../lib/data.js";
import { getSessionUserFromRequest } from "../../../../../lib/user-service.js";

function resolveCurrentV2Status(lead) {
  return lead.caseRecord?.status || lead.adminFollowUpRecord?.status || "report_viewed";
}

export async function POST(request, { params }) {
  try {
    const user = await getSessionUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ ok: false, message: "请先登录后再提交咨询意向。" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const resolvedParams = await params;
    const bundle = await getLead(resolvedParams.submissionId);

    if (!bundle.lead) {
      return NextResponse.json({ ok: false, message: "案例不存在。" }, { status: 404 });
    }

    const lead = bundle.lead;
    const isOwner = lead.userId === user.id || lead.user_id === user.id || lead.answers?.userId === user.id;
    const isOperator = user.role === "admin" || user.role === "consultant";

    if (!isOwner && !isOperator) {
      return NextResponse.json({ ok: false, message: "你没有权限提交这个案例的咨询意向。" }, { status: 403 });
    }

    const currentV2Status = resolveCurrentV2Status(lead);

    if (["closed", "nurturing"].includes(currentV2Status)) {
      return NextResponse.json({ ok: false, message: "当前案例状态不支持提交咨询意向，请联系管理员处理。" }, { status: 409 });
    }

    const existingMobile =
      lead.consultationRequest?.mobile?.trim() ||
      lead.answers?.mobile?.trim() ||
      user.mobile?.trim() ||
      "";
    const existingWechatId =
      lead.consultationRequest?.wechatId?.trim() ||
      lead.answers?.wechat_id?.trim() ||
      "";
    const submittedMobile = typeof body.mobile === "string" ? body.mobile.trim() : null;
    const submittedWechatId = typeof body.wechatId === "string" ? body.wechatId.trim() : null;
    const resolvedMobile = submittedMobile ?? existingMobile;
    const resolvedWechatId = submittedWechatId ?? existingWechatId;

    if (!resolvedMobile && !resolvedWechatId) {
      return NextResponse.json({ ok: false, message: "请至少填写手机号或微信号。" }, { status: 400 });
    }

    const updatedLead = await updateLead(lead.id, {
      submitConsultationIntent: true,
      consultationRequestStatus: "submitted",
      consultationMobile: resolvedMobile,
      consultationWechatId: resolvedWechatId,
      consultationContactTimePreference:
        typeof body.contactTimePreference === "string"
          ? body.contactTimePreference
          : lead.consultationRequest?.contactTimePreference || lead.answers?.contactWindow || "flexible",
      consultationNotes: typeof body.notes === "string" ? body.notes : lead.consultationRequest?.notes || ""
    });

    if (!updatedLead) {
      return NextResponse.json({ ok: false, message: "案例不存在。" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      lead: updatedLead
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交咨询意向失败";

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
