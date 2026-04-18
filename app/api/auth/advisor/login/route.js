import { NextResponse } from "next/server";
import {
  createUserSessionToken,
  getUserSessionCookieOptions,
  hasUserAuthConfig,
  USER_SESSION_COOKIE
} from "../../../../../lib/user-auth.js";
import { absoluteAppUrl } from "../../../../../lib/paths.js";
import { loginUser } from "../../../../../lib/user-service.js";

export async function POST(request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/advisor/workbench");

  if (!hasUserAuthConfig()) {
    return NextResponse.redirect(absoluteAppUrl("/advisor/login?error=config", request.url), { status: 303 });
  }

  try {
    const user = await loginUser({ email, password });

    if (!["consultant", "admin", "super_admin"].includes(user.role)) {
      const loginUrl = absoluteAppUrl("/advisor/login", request.url);
      loginUrl.searchParams.set("error", "role");
      return NextResponse.redirect(loginUrl, { status: 303 });
    }

    const response = NextResponse.redirect(
      absoluteAppUrl(next.startsWith("/") ? next : "/advisor/workbench", request.url),
      { status: 303 }
    );
    response.cookies.set(USER_SESSION_COOKIE, await createUserSessionToken(user), getUserSessionCookieOptions());
    return response;
  } catch {
    const loginUrl = absoluteAppUrl("/advisor/login", request.url);
    if (next && next.startsWith("/")) {
      loginUrl.searchParams.set("next", next);
    }
    loginUrl.searchParams.set("error", "credentials");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }
}
