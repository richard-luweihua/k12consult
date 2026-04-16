export const USER_SESSION_COOKIE = "k12_user_session";
export const USER_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function encoder() {
  return new TextEncoder();
}

function toBase64Url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
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

export function getUserAuthSecret() {
  return (
    process.env.USER_SESSION_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.ADMIN_ACCESS_PASSWORD ||
    ""
  );
}

export function hasUserAuthConfig() {
  return Boolean(getUserAuthSecret());
}

export function getAdvisorInviteCode() {
  return process.env.ADVISOR_INVITE_CODE || process.env.ADMIN_ACCESS_PASSWORD || "";
}

export function hasAdvisorInviteConfig() {
  return Boolean(getAdvisorInviteCode());
}

export async function createUserSessionToken(user) {
  const secret = getUserAuthSecret();

  if (!secret) {
    return "";
  }

  const payload = JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    consultant_id: user.consultant_id || user.consultantId || null,
    exp: Date.now() + USER_SESSION_MAX_AGE * 1000
  });
  const encoded = toBase64Url(payload);
  const signature = await signPayload(encoded, secret);

  return `${encoded}.${signature}`;
}

export async function verifyUserSessionToken(token) {
  if (!hasUserAuthConfig()) {
    return null;
  }

  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = await signPayload(encoded, getUserAuthSecret());

  if (expected !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded));

    if (!payload?.exp || Number(payload.exp) <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getUserSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_SESSION_MAX_AGE
  };
}
