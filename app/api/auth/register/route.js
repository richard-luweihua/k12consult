import { NextResponse } from "next/server";
import { createUserSessionToken, getUserSessionCookieOptions, hasUserAuthConfig, USER_SESSION_COOKIE } from "../../../../lib/user-auth.js";
import { registerUser } from "../../../../lib/user-service.js";

export async function POST(request) {
  try {
    if (!hasUserAuthConfig()) {
      return NextResponse.json({ ok: false, message: "用户认证尚未配置完成" }, { status: 503 });
    }

    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ ok: false, message: "请填写完整的姓名、邮箱和密码" }, { status: 400 });
    }

    const user = await registerUser({ email, password, fullName });
    const token = await createUserSessionToken(user);
    const response = NextResponse.json({ ok: true, user });

    response.cookies.set(USER_SESSION_COOKIE, token, getUserSessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "注册失败"
      },
      { status: 500 }
    );
  }
}
