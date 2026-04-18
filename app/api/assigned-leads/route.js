import { NextResponse } from "next/server";
import { listAssignedLeadsForConsultant } from "../../../lib/data.js";
import { sanitizeLeadForActor } from "../../../lib/lead-access.js";
import { getSessionUserFromRequest } from "../../../lib/user-service.js";

export async function GET(request) {
  try {
    const user = await getSessionUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 });
    }

    if (!["consultant", "admin", "super_admin"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "无权限访问" }, { status: 403 });
    }

    const consultantKey = user.consultant_id || user.consultantId || user.id;
    const actor = {
      role: user.role,
      userId: user.id,
      consultantKey
    };
    const leads = (await listAssignedLeadsForConsultant(consultantKey)).map((lead) => sanitizeLeadForActor(actor, lead));
    return NextResponse.json({ ok: true, leads });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "读取分配线索失败"
      },
      { status: 500 }
    );
  }
}
