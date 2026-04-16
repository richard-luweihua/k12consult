import { NextResponse } from "next/server";
import { getLead } from "../../../../lib/data";

export async function GET(_request, { params }) {
  try {
    const resolvedParams = await params;
    const bundle = await getLead(resolvedParams.submissionId);

    if (!bundle.lead) {
      return NextResponse.json({ ok: false, message: "结果不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lead: bundle.lead });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "获取结果失败"
      },
      { status: 500 }
    );
  }
}
