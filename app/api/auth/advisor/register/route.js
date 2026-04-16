import { NextResponse } from "next/server";
import {
  createUserSessionToken,
  getAdvisorInviteCode,
  getUserSessionCookieOptions,
  hasAdvisorInviteConfig,
  hasUserAuthConfig,
  USER_SESSION_COOKIE
} from "../../../../../lib/user-auth.js";
import { absoluteAppUrl } from "../../../../../lib/paths.js";
import { registerUser } from "../../../../../lib/user-service.js";

export async function POST(request) {
  const formData = await request.formData();
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const inviteCode = String(formData.get("inviteCode") || "");
  const consultantId = String(formData.get("consultantId") || "").trim();

  if (!hasUserAuthConfig()) {
    return NextResponse.redirect(absoluteAppUrl("/advisor/register?error=config", request.url), { status: 303 });
  }

  if (!hasAdvisorInviteConfig()) {
    return NextResponse.redirect(absoluteAppUrl("/advisor/register?error=invite_missing", request.url), { status: 303 });
  }

  if (!fullName || !email || !password || !consultantId) {
    return NextResponse.redirect(absoluteAppUrl("/advisor/register?error=incomplete", request.url), { status: 303 });
  }

  if (inviteCode !== getAdvisorInviteCode()) {
    return NextResponse.redirect(absoluteAppUrl("/advisor/register?error=invite", request.url), { status: 303 });
  }

  try {
    const user = await registerUser({
      email,
      password,
      fullName,
      role: "consultant",
      consultantId
    });
    const response = NextResponse.redirect(absoluteAppUrl("/advisor", request.url), { status: 303 });
    response.cookies.set(USER_SESSION_COOKIE, await createUserSessionToken(user), getUserSessionCookieOptions());
    return response;
  } catch {
    return NextResponse.redirect(absoluteAppUrl("/advisor/register?error=register", request.url), { status: 303 });
  }
}
