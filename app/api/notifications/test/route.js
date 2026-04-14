import { NextResponse } from "next/server";
import { diagnoseWeCom, sendWeComTestNotification } from "../../../../lib/notifications";

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const priority = payload.priority === "high" ? "high" : "normal";
    const status = diagnoseWeCom();

    if (!status.ready) {
      return NextResponse.json(
        {
          ok: false,
          message: status.message
        },
        { status: 400 }
      );
    }

    const result = await sendWeComTestNotification(priority);

    return NextResponse.json({
      ok: true,
      message: priority === "high" ? "高优先级测试通知已发送。" : "普通测试通知已发送。",
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "企业微信测试通知发送失败"
      },
      { status: 500 }
    );
  }
}
