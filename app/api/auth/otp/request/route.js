import { NextResponse } from "next/server";
import { createOtpChallenge, isOtpMockEnabled } from "../../../../../lib/otp-auth.js";
import { hasUserAuthConfig } from "../../../../../lib/user-auth.js";

export async function POST(request) {
  try {
    if (!hasUserAuthConfig()) {
      return NextResponse.json({ ok: false, message: "用户认证尚未配置完成" }, { status: 503 });
    }

    if (!isOtpMockEnabled()) {
      return NextResponse.json(
        {
          ok: false,
          message: "当前环境未配置短信验证码通道，暂不支持手机号验证码登录。"
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const mobile = typeof body.mobile === "string" ? body.mobile : "";
    const purpose = typeof body.purpose === "string" ? body.purpose : "login";

    if (!mobile.trim()) {
      return NextResponse.json({ ok: false, message: "请输入手机号" }, { status: 400 });
    }

    const challenge = await createOtpChallenge({ mobile, purpose });
    return NextResponse.json({
      ok: true,
      challengeId: challenge.challengeId,
      maskedMobile: challenge.maskedMobile,
      expiresAt: challenge.expiresAt,
      mockMode: isOtpMockEnabled(),
      debugCode: challenge.debugCode ?? null
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "验证码发送失败"
      },
      { status: 500 }
    );
  }
}
