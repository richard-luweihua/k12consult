import { NextResponse } from "next/server";
import { assignCaseToConsultant, ValidationError } from "../../../../../../lib/admin-service.js";
import { isAdminRole, resolveActorFromRequest, sanitizeLeadForActor } from "../../../../../../lib/lead-access.js";

export async function PATCH(request, { params }) {
  try {
    const actor = await resolveActorFromRequest(request);

    if (!actor.role) {
      return NextResponse.json({ ok: false, message: "请先登录管理台" }, { status: 401 });
    }

    if (!isAdminRole(actor.role)) {
      return NextResponse.json({ ok: false, message: "仅管理员可操作该接口" }, { status: 403 });
    }

    const { leadId } = await params;
    const payload = await request.json();
    const lead = await assignCaseToConsultant(leadId, payload.assignedConsultantId);

    if (!lead) {
      return NextResponse.json({ ok: false, message: "线索不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lead: sanitizeLeadForActor(actor, lead) });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "指派顾问失败"
      },
      { status: 500 }
    );
  }
}
