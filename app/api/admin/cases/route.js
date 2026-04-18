import { NextResponse } from "next/server";
import { listAdminCases, ValidationError } from "../../../../lib/admin-service.js";
import { isAdminRole, resolveActorFromRequest } from "../../../../lib/lead-access.js";

function collectFilters(searchParams) {
  const keys = ["v2Status", "intentLevel", "budgetLevel", "consultantId", "assigned", "keyword"];
  const filters = {};

  for (const key of keys) {
    const value = searchParams.get(key);

    if (value !== null && value !== "") {
      filters[key] = value;
    }
  }

  return filters;
}

export async function GET(request) {
  try {
    const actor = await resolveActorFromRequest(request);

    if (!actor.role) {
      return NextResponse.json({ ok: false, message: "请先登录管理台" }, { status: 401 });
    }

    if (!isAdminRole(actor.role)) {
      return NextResponse.json({ ok: false, message: "仅管理员可访问该接口" }, { status: 403 });
    }

    const filters = collectFilters(request.nextUrl.searchParams);
    const result = await listAdminCases(filters);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "读取案例列表失败"
      },
      { status: 500 }
    );
  }
}
