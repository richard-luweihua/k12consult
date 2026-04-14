import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, hasAdminAuthConfig, verifyAdminSessionToken } from "./lib/admin-auth";

function isProtectedApi(pathname) {
  return pathname.startsWith("/api/leads/") || pathname.startsWith("/api/notifications/");
}

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const advisorPath = pathname.replace(/^\/admin/, "/advisor") || "/advisor";
    const url = new URL(`${advisorPath}${search}`, request.url);
    return NextResponse.redirect(url);
  }

  if (!hasAdminAuthConfig()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const authenticated = await verifyAdminSessionToken(token);

  if (pathname === "/advisor/login") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/advisor", request.url));
    }

    return NextResponse.next();
  }

  if (authenticated) {
    return NextResponse.next();
  }

  if (isProtectedApi(pathname)) {
    return NextResponse.json(
      {
        ok: false,
        message: "请先登录管理台"
      },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/advisor/login", request.url);

  if (pathname !== "/advisor") {
    loginUrl.searchParams.set("next", `${pathname}${search}`);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/advisor/:path*", "/api/leads/:path*", "/api/notifications/:path*"]
};
