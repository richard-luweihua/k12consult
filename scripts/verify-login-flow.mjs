#!/usr/bin/env node

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3002";
const mode = process.env.LOGIN_VERIFY_MODE || "email_password";

const testEmail = process.env.TEST_EMAIL || "";
const testPassword = process.env.TEST_PASSWORD || "Passw0rd!123456";
const testFullName = process.env.TEST_FULL_NAME || "Login Verify User";
const testMobile = process.env.TEST_MOBILE || "";
const otpCode = process.env.OTP_TEST_CODE || "";

const otpRequestPath = process.env.OTP_REQUEST_PATH || "/api/auth/otp/request";
const otpVerifyPath = process.env.OTP_VERIFY_PATH || "/api/auth/otp/verify";
const sessionPath = process.env.SESSION_PATH || "/api/auth/session";
const loginPath = process.env.LOGIN_PATH || "/api/auth/login";
const registerPath = process.env.REGISTER_PATH || "/api/auth/register";
const logoutPath = process.env.LOGOUT_PATH || "/api/auth/logout";
const authGatePathTemplate =
  process.env.AUTH_GATE_PATH_TEMPLATE || "/api/results/__CASE_ID__/consultation-intent";

const fakeCaseId = process.env.FAKE_CASE_ID || "00000000-0000-0000-0000-000000000000";
const authGatePath = authGatePathTemplate.replace("__CASE_ID__", fakeCaseId);

function nowStamp() {
  return new Date().toISOString();
}

function randomEmail() {
  const suffix = Date.now().toString(36);
  return `login-verify-${suffix}@example.com`;
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function firstCookiePair(setCookieHeader) {
  if (!setCookieHeader) {
    return "";
  }

  const parts = setCookieHeader.split(",");

  for (const part of parts) {
    const candidate = part.trim().split(";")[0];
    if (candidate.includes("=")) {
      return candidate;
    }
  }

  return "";
}

async function requestJson(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, options);
  const raw = await response.text();
  const json = parseJsonSafe(raw);
  return { response, raw, json, url };
}

function printStep(ok, title, detail = "") {
  const icon = ok ? "PASS" : "FAIL";
  console.log(`[${icon}] ${title}${detail ? ` -> ${detail}` : ""}`);
}

function failWith(message) {
  console.error(`\n[FAILED] ${message}`);
  process.exit(1);
}

async function verifySession(cookie, expectedUserPresent) {
  const { response, json, raw } = await requestJson(sessionPath, {
    method: "GET",
    headers: cookie ? { cookie } : {}
  });

  if (!response.ok) {
    failWith(`读取会话失败 (${response.status}): ${raw}`);
  }

  if (!json || json.ok !== true) {
    failWith(`会话接口返回非预期结果: ${raw}`);
  }

  const hasUser = Boolean(json.user);

  if (hasUser !== expectedUserPresent) {
    failWith(
      `会话状态不符合预期。expected user=${expectedUserPresent}, actual user=${hasUser}, payload=${JSON.stringify(json)}`
    );
  }

  printStep(true, "会话状态校验", `user=${hasUser ? "present" : "null"}`);
}

async function verifyAuthGateWithoutAndWithCookie(cookie) {
  const unauth = await requestJson(authGatePath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  if (unauth.response.status !== 401) {
    failWith(`未登录访问受保护接口应为 401，实际 ${unauth.response.status} (${unauth.raw})`);
  }
  printStep(true, "受保护接口未登录拦截", "401");

  const authed = await requestJson(authGatePath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie
    },
    body: JSON.stringify({})
  });

  if (authed.response.status === 401) {
    failWith(`已登录访问受保护接口仍返回 401 (${authed.raw})`);
  }

  printStep(true, "受保护接口已登录放行", `status=${authed.response.status}`);
}

async function verifyEmailPasswordFlow() {
  let email = testEmail || randomEmail();
  let sessionCookie = "";

  if (testEmail) {
    const login = await requestJson(loginPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: testPassword })
    });

    if (!login.response.ok) {
      failWith(`邮箱登录失败 (${login.response.status}): ${login.raw}`);
    }

    sessionCookie = firstCookiePair(login.response.headers.get("set-cookie"));
    if (!sessionCookie) {
      failWith("邮箱登录成功但未写入会话 Cookie");
    }
    printStep(true, "邮箱登录", email);
  } else {
    const register = await requestJson(registerPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: testPassword,
        fullName: testFullName
      })
    });

    if (!register.response.ok) {
      failWith(
        `自动注册失败 (${register.response.status})。请设置 TEST_EMAIL/TEST_PASSWORD 使用现有账号重跑。detail=${register.raw}`
      );
    }

    sessionCookie = firstCookiePair(register.response.headers.get("set-cookie"));
    if (!sessionCookie) {
      failWith("注册成功但未写入会话 Cookie");
    }
    printStep(true, "邮箱注册+登录", email);
  }

  await verifySession(sessionCookie, true);
  await verifyAuthGateWithoutAndWithCookie(sessionCookie);

  const logout = await requestJson(logoutPath, {
    method: "POST",
    headers: { cookie: sessionCookie }
  });

  if (!logout.response.ok) {
    failWith(`退出登录失败 (${logout.response.status}): ${logout.raw}`);
  }
  printStep(true, "退出登录", "ok");

  await verifySession("", false);
}

async function verifyMobileOtpFlow() {
  if (!testMobile) {
    failWith("LOGIN_VERIFY_MODE=mobile_otp 时必须提供 TEST_MOBILE");
  }

  const requestOtp = await requestJson(otpRequestPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mobile: testMobile,
      purpose: "login"
    })
  });

  if (!requestOtp.response.ok || !requestOtp.json?.ok) {
    failWith(`OTP 请求失败 (${requestOtp.response.status}): ${requestOtp.raw}`);
  }
  printStep(true, "手机号验证码请求", testMobile);

  const resolvedOtpCode = otpCode || requestOtp.json?.debugCode || requestOtp.json?.debug_code || "";

  if (!resolvedOtpCode) {
    failWith("请提供 OTP_TEST_CODE，或确保 OTP 接口在开发环境返回 debugCode。");
  }

  const verifyOtp = await requestJson(otpVerifyPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mobile: testMobile,
      code: resolvedOtpCode,
      challengeId: requestOtp.json.challengeId || requestOtp.json.challenge_id || null
    })
  });

  if (!verifyOtp.response.ok || !verifyOtp.json?.ok) {
    failWith(`OTP 验证失败 (${verifyOtp.response.status}): ${verifyOtp.raw}`);
  }

  const sessionCookie = firstCookiePair(verifyOtp.response.headers.get("set-cookie"));
  if (!sessionCookie) {
    failWith("OTP 验证成功但未写入会话 Cookie");
  }
  printStep(true, "手机号验证码登录", testMobile);

  await verifySession(sessionCookie, true);
  await verifyAuthGateWithoutAndWithCookie(sessionCookie);

  const logout = await requestJson(logoutPath, {
    method: "POST",
    headers: { cookie: sessionCookie }
  });

  if (!logout.response.ok) {
    failWith(`退出登录失败 (${logout.response.status}): ${logout.raw}`);
  }
  printStep(true, "退出登录", "ok");
}

async function main() {
  console.log(`[INFO] ${nowStamp()} 登录流程快速验证开始`);
  console.log(`[INFO] baseUrl=${baseUrl}`);
  console.log(`[INFO] mode=${mode}`);

  const health = await requestJson("/", { method: "GET" });
  if (!health.response.ok) {
    failWith(`服务不可用，请先启动应用。GET / -> ${health.response.status}`);
  }
  printStep(true, "服务可达", health.url);

  if (mode === "email_password") {
    await verifyEmailPasswordFlow();
  } else if (mode === "mobile_otp") {
    await verifyMobileOtpFlow();
  } else {
    failWith(`不支持的 LOGIN_VERIFY_MODE: ${mode}`);
  }

  console.log("\n[DONE] 登录流程快速验证通过");
}

main().catch((error) => {
  failWith(error instanceof Error ? error.message : String(error));
});
