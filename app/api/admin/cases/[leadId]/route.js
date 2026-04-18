import { NextResponse } from "next/server";
import { ValidationError } from "../../../../../lib/case-flow.js";
import { getLead, updateLead } from "../../../../../lib/data";
import { isAdminRole, resolveActorFromRequest, sanitizeLeadForActor } from "../../../../../lib/lead-access";

export async function GET(request, { params }) {
  try {
    const actor = await resolveActorFromRequest(request);

    if (!actor.role) {
      return NextResponse.json({ ok: false, message: "请先登录管理台" }, { status: 401 });
    }

    if (!isAdminRole(actor.role)) {
      return NextResponse.json({ ok: false, message: "仅管理员可访问该接口" }, { status: 403 });
    }

    const resolvedParams = await params;
    const bundle = await getLead(resolvedParams.leadId);

    if (!bundle.lead) {
      return NextResponse.json({ ok: false, message: "线索不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...bundle, lead: sanitizeLeadForActor(actor, bundle.lead) });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message
        },
        { status: 400 }
      );
    }

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

    if (!isAdminRole(actor.role)) {
      return NextResponse.json({ ok: false, message: "仅管理员可更新该接口" }, { status: 403 });
    }

    const resolvedParams = await params;
    const bundle = await getLead(resolvedParams.leadId);

    if (!bundle.lead) {
      return NextResponse.json({ ok: false, message: "线索不存在" }, { status: 404 });
    }

    const payload = await request.json();
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
