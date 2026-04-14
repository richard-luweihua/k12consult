import { NextResponse } from "next/server";
import { createLead } from "../../../lib/data";

export async function POST(request) {
  try {
    const payload = await request.json();
    const lead = await createLead(payload);

    return NextResponse.json({
      ok: true,
      submissionId: lead.id
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "提交失败"
      },
      { status: 500 }
    );
  }
}
