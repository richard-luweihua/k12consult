import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminPassword,
  getAdminSessionCookieOptions,
  hasAdminAuthConfig
} from "../../../../lib/admin-auth";
import { appPath } from "../../../../lib/paths";

export async function POST(request) {
  if (!hasAdminAuthConfig()) {
    return NextResponse.redirect(new URL(appPath("/advisor"), request.url), { status: 303 });
  }

  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/advisor");

  if (!password || password !== getAdminPassword()) {
    const loginUrl = new URL(appPath("/advisor/login"), request.url);

    if (next && next.startsWith("/")) {
      loginUrl.searchParams.set("next", next);
    }

    loginUrl.searchParams.set("error", "1");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(appPath(next.startsWith("/") ? next : "/advisor"), request.url), { status: 303 });
  response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSessionToken(), getAdminSessionCookieOptions());

  return response;
}
