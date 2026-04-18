import { NextResponse } from "next/server";
import { ValidationError, consultantAllowedV2Statuses } from "../../../../../lib/case-flow.js";
import { getLead, updateLead } from "../../../../../lib/data";
import {
  canActorOperateLead,
  canActorViewLead,
  isAdminRole,
  resolveActorFromRequest,
  sanitizeLeadForActor
} from "../../../../../lib/lead-access";

const advisorReadableRoles = new Set(["consultant", "admin", "super_admin"]);
const consultantForbiddenFields = new Set([
  "assignedConsultantId",
  "status",
  "intentLevel",
  "targetTimeline",
  "budgetLevel",
  "consultFocus",
  "missingInfo",
  "handoffSummary",
  "adminInternalNotes",
  "slaStatus",
  "firstContactAt",
  "markQualified"
]);

export async function GET(request, { params }) {
  try {
    const actor = await resolveActorFromRequest(request);

    if (!actor.role) {
      return NextResponse.json({ ok: false, message: "请先登录顾问工作台" }, { status: 401 });
    }

    if (!advisorReadableRoles.has(actor.role)) {
      return NextResponse.json({ ok: false, message: "仅顾问或管理员可访问该接口" }, { status: 403 });
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
      return NextResponse.json({ ok: false, message: "请先登录顾问工作台" }, { status: 401 });
    }

    if (!advisorReadableRoles.has(actor.role)) {
      return NextResponse.json({ ok: false, message: "仅顾问或管理员可更新该接口" }, { status: 403 });
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

    if (!isAdminRole(actor.role)) {
      for (const key of Object.keys(payload)) {
        if (consultantForbiddenFields.has(key)) {
          return NextResponse.json({ ok: false, message: "顾问无权修改管理员字段" }, { status: 403 });
        }
      }

      if (typeof payload.v2Status === "string" && !consultantAllowedV2Statuses.has(payload.v2Status)) {
        return NextResponse.json({ ok: false, message: "顾问当前不允许切换到该状态" }, { status: 403 });
      }
    }

    const lead = await updateLead(resolvedParams.leadId, payload);

    if (!lead) {
      return NextResponse.json({ ok: false, message: "线索不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lead: sanitizeLeadForActor(actor, lead) });
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
        message: error instanceof Error ? error.message : "更新失败"
      },
      { status: 500 }
    );
  }
}
