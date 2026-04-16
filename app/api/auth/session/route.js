import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "../../../../lib/user-service.js";

export async function GET(request) {
  try {
    const user = await getSessionUserFromRequest(request);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "读取会话失败"
      },
      { status: 500 }
    );
  }
}
