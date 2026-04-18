import { NextResponse } from "next/server";
import { getLead } from "../../../../lib/data";
import { canActorViewLead, resolveActorFromRequest, sanitizeLeadForActor } from "../../../../lib/lead-access";

export async function GET(request, { params }) {
  try {
    const actor = await resolveActorFromRequest(request);

    if (!actor.role) {
      return NextResponse.json({ ok: false, message: "请先登录后再查看报告。" }, { status: 401 });
    }

    const resolvedParams = await params;
    const bundle = await getLead(resolvedParams.submissionId);

    if (!bundle.lead) {
      return NextResponse.json({ ok: false, message: "结果不存在" }, { status: 404 });
    }

    if (!canActorViewLead(actor, bundle.lead)) {
      return NextResponse.json({ ok: false, message: "无权限查看该结果。" }, { status: 403 });
    }

    return NextResponse.json({ ok: true, lead: sanitizeLeadForActor(actor, bundle.lead) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "获取结果失败"
      },
      { status: 500 }
    );
  }
}
