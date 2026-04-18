import { NextResponse } from "next/server";
import { listLeadsForUser } from "../../../lib/data.js";
import { sanitizeLeadForActor } from "../../../lib/lead-access.js";
import { getSessionUserFromRequest } from "../../../lib/user-service.js";

export async function GET(request) {
  try {
    const user = await getSessionUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 });
    }

    const actor = {
      role: user.role,
      userId: user.id,
      consultantKey: user.consultant_id || user.consultantId || user.id
    };
    const leads = (await listLeadsForUser(user.id)).map((lead) => sanitizeLeadForActor(actor, lead));
    return NextResponse.json({ ok: true, leads });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "读取线索失败"
      },
      { status: 500 }
    );
  }
}
