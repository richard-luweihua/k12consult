# 登录流程快速验证方案 (A 方案)

适用范围：`手机号验证码主登录 + 邮箱密码备用登录`。

当前策略：**暂不接短信通道确认**，先用 OTP Mock 打通验证流程。

目标：开发完成后，用最短时间验证登录主链路是否可上线。

---

## 1. 验收目标

P0 必过项：
1. 未登录状态能正常访问问卷，关键动作会被登录门禁拦截。
2. 登录成功后会话生效，能通过受保护接口权限校验。
3. 退出登录后会话失效，受保护接口重新返回 401。
4. 角色跳转正确（家长/顾问/管理员）。

P1 建议项：
1. 异常账号输入有清晰错误提示。
2. 异常设备登录触发二次验证（若已实现）。
3. 同账号多端会话可管理（若已实现）。

---

## 2. 验证前准备

1. 启动服务：`npm run dev -- --port 3002`
2. 准备环境变量（`.env.local`）：
   - `USER_SESSION_SECRET` 或 `SUPABASE_SECRET_KEY`
   - （如果测邮箱登录）可用测试账号
   - （如果测手机号 OTP）短信服务或 OTP mock 能返回测试码

---

## 3. 一键快速验证 (推荐)

### 3.1 邮箱密码模式（当前可用）

直接跑：

```bash
npm run verify:login
```

说明：
- 不传 `TEST_EMAIL` 时，脚本会尝试自动注册随机邮箱并完成验证。
- 若你要使用固定测试账号：

```bash
BASE_URL=http://127.0.0.1:3002 \
TEST_EMAIL=qa_user@example.com \
TEST_PASSWORD='YourPassword123' \
npm run verify:login
```

### 3.2 手机验证码模式（A 方案开发完成后）

```bash
BASE_URL=http://127.0.0.1:3002 \
LOGIN_VERIFY_MODE=mobile_otp \
TEST_MOBILE=13800000000 \
OTP_REQUEST_PATH=/api/auth/otp/request \
OTP_VERIFY_PATH=/api/auth/otp/verify \
npm run verify:login
```

说明：
- 不传 `OTP_TEST_CODE` 时，脚本会优先读取 OTP 接口返回的 `debugCode`。
- 也可以显式设置固定验证码：`OTP_TEST_CODE=123456`。
- 如果接口路径不同，改 `OTP_REQUEST_PATH` 和 `OTP_VERIFY_PATH` 即可。

---

## 4. 脚本覆盖的检查项

1. 服务可达检查（`GET /`）。
2. 登录或注册并写入会话 Cookie。
3. 会话接口校验（`GET /api/auth/session`）。
4. 受保护接口拦截校验：
   - 未登录应 401
   - 已登录不应 401
5. 退出登录后会话失效。

脚本文件：`scripts/verify-login-flow.mjs`

---

## 5. 手工补充验证（5 分钟）

1. 打开 `/questionnaire`，未登录可填写。
2. 在结果页触发“提交咨询意向”，应跳登录或返回未登录提示。
3. 登录后回到原业务页面（`next` 回跳生效）。
4. 进入对应工作区：
   - 家长：`/dashboard` 或结果页
   - 顾问：`/advisor`
   - 管理员：`/admin`
5. 退出登录后刷新受保护页面，确认重新鉴权。

---

## 6. 判定标准（Go / No-Go）

Go（可进入联调/预发布）：
- P0 全部通过。
- 无阻断级错误（500、会话错乱、角色越权）。

No-Go（必须修复）：
- 登录成功但 `session` 为空。
- 已登录仍被所有受保护接口拦截。
- 退出后仍能访问受保护接口。
- 角色跳转错误（例如家长进入管理员后台）。

---

## 7. 建议的 CI 接入

在登录功能分支合并前，至少自动执行一次：

```bash
BASE_URL=http://127.0.0.1:3002 npm run verify:login
```

当 OTP 接口上线后，再增加 mobile_otp 模式的 nightly 验证。
