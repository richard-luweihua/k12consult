import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminPassword,
  getAdminSessionCookieOptions,
  hasAdminAuthConfig
} from "../../../../lib/admin-auth";
import { appPath } from "../../../../lib/paths";

function buildRedirectUrl(request, targetPath) {
  const url = request.nextUrl.clone();
  const parsed = new URL(targetPath, "http://localhost");
  url.pathname = appPath(parsed.pathname);
  url.search = parsed.search;
  return url;
}

function resolveNextPath(rawNext, fallback = "/admin/workbench") {
  if (typeof rawNext !== "string") {
    return fallback;
  }

  const next = rawNext.trim();

  if (!next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}

export async function POST(request) {
  if (!hasAdminAuthConfig()) {
    return NextResponse.redirect(buildRedirectUrl(request, "/admin/workbench"), { status: 303 });
  }

  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const next = resolveNextPath(String(formData.get("next") || ""), "/admin/workbench");

  if (!password || password !== getAdminPassword()) {
    const loginUrl = buildRedirectUrl(request, "/admin/login");
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", "1");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const response = NextResponse.redirect(buildRedirectUrl(request, next), { status: 303 });
  response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSessionToken(), getAdminSessionCookieOptions());

  return response;
}
