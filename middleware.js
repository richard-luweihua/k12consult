import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, hasAdminAuthConfig, verifyAdminSessionToken } from "./lib/admin-auth";
import { appPath, stripBasePath } from "./lib/paths";
import { USER_SESSION_COOKIE, verifyUserSessionToken } from "./lib/user-auth";

function isProtectedApi(pathname) {
  return (
    pathname.startsWith("/api/leads/") ||
    pathname.startsWith("/api/admin/consultants") ||
    pathname.startsWith("/api/admin/cases") ||
    pathname.startsWith("/api/admin/cases/") ||
    pathname.startsWith("/api/advisor/cases/") ||
    pathname.startsWith("/api/results/") ||
    pathname.startsWith("/api/notifications/")
  );
}

function isResultsApi(pathname) {
  return pathname.startsWith("/api/results/");
}

function canAccessAdvisorWorkspace(session) {
  return Boolean(session && ["consultant", "admin", "super_admin"].includes(session.role));
}

function canAccessAdminWorkspace(session) {
  return Boolean(session && ["admin", "super_admin"].includes(session.role));
}

function buildRedirectUrl(request, targetPath) {
  const url = request.nextUrl.clone();
  const parsed = new URL(targetPath, "http://localhost");
  url.pathname = appPath(parsed.pathname);
  url.search = parsed.search;
  return url;
}

export async function middleware(request) {
  const { search } = request.nextUrl;
  const pathname = stripBasePath(request.nextUrl.pathname);

  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const userToken = request.cookies.get(USER_SESSION_COOKIE)?.value;
  const [authenticated, userSession] = await Promise.all([
    hasAdminAuthConfig() ? verifyAdminSessionToken(adminToken) : Promise.resolve(false),
    verifyUserSessionToken(userToken)
  ]);
  const advisorAuthenticated = authenticated || canAccessAdvisorWorkspace(userSession);
  const adminAuthenticated = authenticated || canAccessAdminWorkspace(userSession);
  const userAuthenticated = authenticated || Boolean(userSession);

  if (pathname === "/advisor/login" || pathname === "/advisor/register") {
    if (advisorAuthenticated) {
      const nextPath = request.nextUrl.searchParams.get("next");

      if (nextPath?.startsWith("/admin") && adminAuthenticated) {
        return NextResponse.redirect(buildRedirectUrl(request, nextPath));
      }

      return NextResponse.redirect(buildRedirectUrl(request, "/advisor/workbench"));
    }

    return NextResponse.next();
  }

  if (pathname === "/admin/login") {
    if (adminAuthenticated) {
      return NextResponse.redirect(buildRedirectUrl(request, "/admin/workbench"));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (adminAuthenticated) {
      return NextResponse.next();
    }

    if (advisorAuthenticated) {
      return NextResponse.redirect(buildRedirectUrl(request, "/advisor/workbench"));
    }

    const loginUrl = buildRedirectUrl(request, "/admin/login");
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (advisorAuthenticated) {
    return NextResponse.next();
  }

  if (isProtectedApi(pathname)) {
    if (isResultsApi(pathname) && userAuthenticated) {
      return NextResponse.next();
    }

    if ((pathname.startsWith("/api/admin/cases") || pathname.startsWith("/api/admin/consultants")) && !adminAuthenticated) {
      return NextResponse.json(
        {
          ok: false,
          message: "请先登录管理台"
        },
        { status: 401 }
      );
    }

    if (pathname.startsWith("/api/advisor/cases/") && !advisorAuthenticated) {
      return NextResponse.json(
        {
          ok: false,
          message: "请先登录顾问工作台"
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: "请先登录管理台"
      },
      { status: 401 }
    );
  }

  const loginUrl = buildRedirectUrl(request, "/advisor/login");

  if (pathname !== "/advisor/workbench") {
    loginUrl.searchParams.set("next", `${pathname}${search}`);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/advisor/:path*",
    "/api/leads/:path*",
    "/api/admin/consultants",
    "/api/admin/consultants/:path*",
    "/api/admin/cases",
    "/api/admin/cases/:path*",
    "/api/advisor/cases/:path*",
    "/api/results/:path*",
    "/api/notifications/:path*"
  ]
};
