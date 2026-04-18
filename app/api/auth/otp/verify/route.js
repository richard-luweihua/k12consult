import { NextResponse } from "next/server";
import {
  createUserSessionToken,
  getUserSessionCookieOptions,
  hasUserAuthConfig,
  USER_SESSION_COOKIE
} from "../../../../../lib/user-auth.js";
import { getOrCreateMockUserByMobile, isOtpMockEnabled, verifyOtpChallenge } from "../../../../../lib/otp-auth.js";

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
    const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const mobile = typeof body.mobile === "string" ? body.mobile : "";
    const code = typeof body.code === "string" ? body.code : "";

    if (!challengeId) {
      return NextResponse.json({ ok: false, message: "challengeId 不能为空" }, { status: 400 });
    }

    if (!mobile.trim()) {
      return NextResponse.json({ ok: false, message: "请输入手机号" }, { status: 400 });
    }

    if (!code.trim()) {
      return NextResponse.json({ ok: false, message: "请输入验证码" }, { status: 400 });
    }

    const verified = await verifyOtpChallenge({
      challengeId,
      mobile,
      code
    });
    const user = await getOrCreateMockUserByMobile(verified.mobile);
    const token = await createUserSessionToken(user);
    const response = NextResponse.json({
      ok: true,
      user,
      mode: "mock_otp"
    });

    response.cookies.set(USER_SESSION_COOKIE, token, getUserSessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "验证码登录失败"
      },
      { status: 400 }
    );
  }
}
