export const ADMIN_SESSION_COOKIE = "k12_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function encoder() {
  return new TextEncoder();
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function signPayload(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  return toHex(await crypto.subtle.sign("HMAC", key, encoder().encode(payload)));
}

export function getAdminPassword() {
  return process.env.ADMIN_ACCESS_PASSWORD || "";
}

export function hasAdminAuthConfig() {
  return Boolean(getAdminPassword());
}

export async function createAdminSessionToken() {
  const password = getAdminPassword();

  if (!password) {
    return "";
  }

  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE * 1000;
  const signature = await signPayload(String(expiresAt), password);

  return `${expiresAt}.${signature}`;
}

export async function verifyAdminSessionToken(token) {
  if (!hasAdminAuthConfig()) {
    return true;
  }

  if (!token) {
    return false;
  }

  const [expiresAt, signature] = token.split(".");

  if (!expiresAt || !signature) {
    return false;
  }

  if (Number(expiresAt) <= Date.now()) {
    return false;
  }

  const expected = await signPayload(expiresAt, getAdminPassword());
  return expected === signature;
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE
  };
}
