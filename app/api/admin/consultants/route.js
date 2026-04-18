import { NextResponse } from "next/server";
import { createConsultant, listConsultants, ValidationError } from "../../../../lib/admin-service.js";
import { isAdminRole, resolveActorFromRequest } from "../../../../lib/lead-access.js";

export async function GET(request) {
  try {
    const actor = await resolveActorFromRequest(request);

    if (!actor.role) {
      return NextResponse.json({ ok: false, message: "请先登录管理台" }, { status: 401 });
    }

    if (!isAdminRole(actor.role)) {
      return NextResponse.json({ ok: false, message: "仅管理员可访问该接口" }, { status: 403 });
    }

    const consultants = await listConsultants();
    return NextResponse.json({ ok: true, consultants });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "读取顾问列表失败"
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const actor = await resolveActorFromRequest(request);

    if (!actor.role) {
      return NextResponse.json({ ok: false, message: "请先登录管理台" }, { status: 401 });
    }

    if (!isAdminRole(actor.role)) {
      return NextResponse.json({ ok: false, message: "仅管理员可操作该接口" }, { status: 403 });
    }

    const payload = await request.json();
    const consultant = await createConsultant(payload);
    return NextResponse.json({ ok: true, consultant }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "创建顾问失败"
      },
      { status: 500 }
    );
  }
}
