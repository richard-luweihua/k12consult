import { NextResponse } from "next/server";
import { updateLead } from "../../../../lib/data";

export async function PATCH(request, { params }) {
  try {
    const payload = await request.json();
    const resolvedParams = await params;
    const lead = await updateLead(resolvedParams.leadId, payload);

    if (!lead) {
      return NextResponse.json({ ok: false, message: "线索不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lead });
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
