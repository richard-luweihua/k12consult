import { NextResponse } from "next/server";
import { getUserSessionCookieOptions, USER_SESSION_COOKIE } from "../../../../lib/user-auth.js";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(USER_SESSION_COOKIE, "", {
    ...getUserSessionCookieOptions(),
    maxAge: 0
  });
  return response;
}
