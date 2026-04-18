import { NextResponse } from "next/server";
import { deleteConsultant, updateConsultant, ValidationError } from "../../../../../lib/admin-service.js";
import { isAdminRole, resolveActorFromRequest } from "../../../../../lib/lead-access.js";

export async function PATCH(request, { params }) {
  try {
    const actor = await resolveActorFromRequest(request);

    if (!actor.role) {
      return NextResponse.json({ ok: false, message: "请先登录管理台" }, { status: 401 });
    }

    if (!isAdminRole(actor.role)) {
      return NextResponse.json({ ok: false, message: "仅管理员可操作该接口" }, { status: 403 });
    }

    const { consultantId } = await params;
    const payload = await request.json();
    const consultant = await updateConsultant(consultantId, payload);

    if (!consultant) {
      return NextResponse.json({ ok: false, message: "顾问不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, consultant });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "更新顾问失败"
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const actor = await resolveActorFromRequest(request);

    if (!actor.role) {
      return NextResponse.json({ ok: false, message: "请先登录管理台" }, { status: 401 });
    }

    if (!isAdminRole(actor.role)) {
      return NextResponse.json({ ok: false, message: "仅管理员可操作该接口" }, { status: 403 });
    }

    const { consultantId } = await params;
    const consultant = await deleteConsultant(consultantId);

    if (!consultant) {
      return NextResponse.json({ ok: false, message: "顾问不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, consultant });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 409 });
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "停用顾问失败"
      },
      { status: 500 }
    );
  }
}
