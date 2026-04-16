import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSessionCookieOptions } from "../../../../lib/admin-auth.js";
import { absoluteAppUrl } from "../../../../lib/paths.js";
import { getUserSessionCookieOptions, USER_SESSION_COOKIE } from "../../../../lib/user-auth.js";

export async function POST(request) {
  const response = NextResponse.redirect(absoluteAppUrl("/advisor/login?logged_out=1", request.url), { status: 303 });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0
  });
  response.cookies.set(USER_SESSION_COOKIE, "", {
    ...getUserSessionCookieOptions(),
    maxAge: 0
  });
  return response;
}
