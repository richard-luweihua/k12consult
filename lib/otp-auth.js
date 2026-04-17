import { promises as fs } from "fs";
import path from "path";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_CHALLENGE_PATH = path.join("/tmp", "k12-otp-challenges.json");
const OTP_MOCK_USERS_PATH = path.join("/tmp", "k12-otp-users.json");

async function readStore(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeStore(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function normalizeMobile(rawMobile) {
  if (typeof rawMobile !== "string") {
    return "";
  }

  return rawMobile.replace(/\s+/g, "").trim();
}

function maskMobile(mobile) {
  if (!mobile || mobile.length < 7) {
    return mobile;
  }

  return `${mobile.slice(0, 3)}****${mobile.slice(-4)}`;
}

function randomOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isOtpMockEnabled() {
  if (typeof process.env.OTP_MOCK_ENABLED === "string") {
    return process.env.OTP_MOCK_ENABLED === "1" || process.env.OTP_MOCK_ENABLED.toLowerCase() === "true";
  }

  return process.env.NODE_ENV !== "production";
}

export function getOtpMockCode() {
  const configured = process.env.OTP_MOCK_CODE;

  if (configured && /^\d{4,8}$/.test(configured)) {
    return configured;
  }

  return "123456";
}

export async function createOtpChallenge({ mobile, purpose = "login" }) {
  const normalizedMobile = normalizeMobile(mobile);

  if (!normalizedMobile) {
    throw new Error("请输入手机号");
  }

  const challengeId = crypto.randomUUID();
  const expiresAt = Date.now() + OTP_TTL_MS;
  const code = isOtpMockEnabled() ? getOtpMockCode() : randomOtpCode();

  const challenges = await readStore(OTP_CHALLENGE_PATH, {});

  // prune expired challenges
  for (const [id, item] of Object.entries(challenges)) {
    if (!item?.expiresAt || Date.now() > Number(item.expiresAt)) {
      delete challenges[id];
    }
  }

  challenges[challengeId] = {
    challengeId,
    mobile: normalizedMobile,
    purpose,
    code,
    attempts: 0,
    expiresAt,
    createdAt: Date.now()
  };

  await writeStore(OTP_CHALLENGE_PATH, challenges);

  return {
    challengeId,
    mobile: normalizedMobile,
    maskedMobile: maskMobile(normalizedMobile),
    expiresAt: new Date(expiresAt).toISOString(),
    debugCode: isOtpMockEnabled() ? code : undefined
  };
}

export async function verifyOtpChallenge({ challengeId, mobile, code }) {
  const challenges = await readStore(OTP_CHALLENGE_PATH, {});
  const challenge = challenges[challengeId];

  if (!challenge) {
    throw new Error("验证码挑战不存在或已过期");
  }

  if (Date.now() > challenge.expiresAt) {
    delete challenges[challengeId];
    await writeStore(OTP_CHALLENGE_PATH, challenges);
    throw new Error("验证码已过期，请重新获取");
  }

  const normalizedMobile = normalizeMobile(mobile);

  if (!normalizedMobile || challenge.mobile !== normalizedMobile) {
    throw new Error("手机号与验证码挑战不匹配");
  }

  const normalizedCode = String(code || "").trim();

  if (!normalizedCode || normalizedCode !== challenge.code) {
    challenge.attempts += 1;

    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      delete challenges[challengeId];
      await writeStore(OTP_CHALLENGE_PATH, challenges);
      throw new Error("验证码输入错误次数过多，请重新获取");
    }

    challenges[challengeId] = challenge;
    await writeStore(OTP_CHALLENGE_PATH, challenges);
    throw new Error("验证码错误");
  }

  delete challenges[challengeId];
  await writeStore(OTP_CHALLENGE_PATH, challenges);
  return {
    mobile: challenge.mobile,
    purpose: challenge.purpose
  };
}

function createMockMobileUser(mobile) {
  const normalizedMobile = normalizeMobile(mobile);
  const suffix = normalizedMobile.replace(/\D/g, "").slice(-6) || "user";
  const userId = `mobile-${suffix}`;

  return {
    id: userId,
    email: `mobile-${suffix}@mock.local`,
    full_name: `手机用户${normalizedMobile.slice(-4) || ""}`,
    role: "user",
    mobile: normalizedMobile,
    consultant_id: null,
    consultantId: null,
    created_at: new Date().toISOString()
  };
}

export async function getOrCreateMockUserByMobile(mobile) {
  const normalizedMobile = normalizeMobile(mobile);

  if (!normalizedMobile) {
    throw new Error("手机号不能为空");
  }

  const users = await readStore(OTP_MOCK_USERS_PATH, {});
  const existing = users[normalizedMobile];

  if (existing) {
    return existing;
  }

  const created = createMockMobileUser(normalizedMobile);
  users[normalizedMobile] = created;
  await writeStore(OTP_MOCK_USERS_PATH, users);
  return created;
}
