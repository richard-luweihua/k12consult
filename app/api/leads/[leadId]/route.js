import { NextResponse } from "next/server";
import { getLead, updateLead } from "../../../../lib/data";
import {
  canActorOperateLead,
  canActorViewLead,
  resolveActorFromRequest,
  sanitizeLeadForActor
} from "../../../../lib/lead-access";

export async function GET(request, { params }) {
  try {
    const actor = await resolveActorFromRequest(request);

    if (!actor.role) {
      return NextResponse.json({ ok: false, message: "请先登录管理台" }, { status: 401 });
    }

    const resolvedParams = await params;
    const bundle = await getLead(resolvedParams.leadId);

    if (!bundle.lead) {
      return NextResponse.json({ ok: false, message: "线索不存在" }, { status: 404 });
    }

    if (!canActorViewLead(actor, bundle.lead)) {
      return NextResponse.json({ ok: false, message: "无权限访问该线索" }, { status: 403 });
    }

    return NextResponse.json({ ok: true, ...bundle, lead: sanitizeLeadForActor(actor, bundle.lead) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "获取线索失败"
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const actor = await resolveActorFromRequest(request);

    if (!actor.role) {
      return NextResponse.json({ ok: false, message: "请先登录管理台" }, { status: 401 });
    }

    const resolvedParams = await params;
    const bundle = await getLead(resolvedParams.leadId);

    if (!bundle.lead) {
      return NextResponse.json({ ok: false, message: "线索不存在" }, { status: 404 });
    }

    if (!canActorOperateLead(actor, bundle.lead)) {
      return NextResponse.json({ ok: false, message: "无权限更新该线索" }, { status: 403 });
    }

    const payload = await request.json();

    if (actor.role === "consultant" && ("assignedConsultantId" in payload || "status" in payload)) {
      return NextResponse.json({ ok: false, message: "顾问无权改派或修改后台状态字段" }, { status: 403 });
    }

    const lead = await updateLead(resolvedParams.leadId, payload);

    if (!lead) {
      return NextResponse.json({ ok: false, message: "线索不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lead: sanitizeLeadForActor(actor, lead) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "更新失败"
      },
      { status: 500 }
    );
  }
}
