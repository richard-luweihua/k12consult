import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "../../../../lib/admin-auth";
import { appPath } from "../../../../lib/paths";

function buildRedirectUrl(request, targetPath) {
  const url = request.nextUrl.clone();
  const parsed = new URL(targetPath, "http://localhost");
  url.pathname = appPath(parsed.pathname);
  url.search = parsed.search;
  return url;
}

export async function POST(request) {
  const response = NextResponse.redirect(buildRedirectUrl(request, "/admin/login?logged_out=1"), { status: 303 });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}
