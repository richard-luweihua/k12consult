import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, hasAdminAuthConfig, verifyAdminSessionToken } from "../../../lib/admin-auth";
import { defaultConsultants } from "../../../lib/consultants";
import { USER_SESSION_COOKIE, hasAdvisorInviteConfig, verifyUserSessionToken } from "../../../lib/user-auth";

function canAccessAdvisor(session) {
  return Boolean(session && ["consultant", "admin"].includes(session.role));
}

export const metadata = {
  title: "顾问账号注册 | 香港 K12 择校前诊 MVP"
};

export default async function AdvisorRegisterPage({ searchParams }) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const userToken = cookieStore.get(USER_SESSION_COOKIE)?.value;
  const [adminAuthenticated, userSession] = await Promise.all([
    hasAdminAuthConfig() ? verifyAdminSessionToken(adminToken) : Promise.resolve(false),
    verifyUserSessionToken(userToken)
  ]);

  if (adminAuthenticated || canAccessAdvisor(userSession)) {
    redirect("/advisor");
  }

  const params = await searchParams;
  const error = params?.error;

  return (
    <main className="page-shell auth-shell">
      <section className="card auth-card advisor-login-card">
        <div className="auth-card-header">
          <p className="advisor-brand-label">SKY MIRROR</p>
          <p className="eyebrow">Advisor Onboarding</p>
        </div>
        <h1>注册顾问账号</h1>
        <p className="hero-text">收到邀请码后，顾问可以在这里完成一次性注册。注册成功后，后续直接用邮箱密码登录 `/advisor`。</p>
        <p className="inline-message">注册时请选择你在系统里的顾问席位，这会决定你登录后看到哪一组分配线索。</p>

        <form action="/api/auth/advisor/register" className="auth-form" method="post">
          <label className="field-block">
            <span className="field-label">顾问姓名</span>
            <input className="text-input" name="fullName" placeholder="例如：Ryan 林老师" required type="text" />
          </label>
          <label className="field-block">
            <span className="field-label">绑定顾问席位</span>
            <select className="text-input" defaultValue="" name="consultantId" required>
              <option disabled value="">
                请选择你对应的顾问席位
              </option>
              {defaultConsultants.map((consultant) => (
                <option key={consultant.id} value={consultant.id}>
                  {consultant.name} / {consultant.focusLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="field-block">
            <span className="field-label">顾问邮箱</span>
            <input autoComplete="email" className="text-input" name="email" placeholder="your.name@company.com" required type="email" />
          </label>
          <label className="field-block">
            <span className="field-label">设置密码</span>
            <input autoComplete="new-password" className="text-input" minLength={8} name="password" placeholder="至少 8 位，建议强密码" required type="password" />
          </label>
          <label className="field-block">
            <span className="field-label">邀请码</span>
            <input className="text-input" name="inviteCode" placeholder="由管理员提供" required type="password" />
          </label>

          {error === "invite" ? <p className="error-text">邀请码不正确，请确认后再试。</p> : null}
          {error === "invite_missing" ? <p className="error-text">系统还没有配置顾问邀请码，请先联系管理员。</p> : null}
          {error === "register" ? <p className="error-text">注册失败，可能是邮箱已存在或格式不正确。</p> : null}
          {error === "config" ? <p className="error-text">顾问账号体系还没配置完成，请先联系管理员。</p> : null}
          {error === "incomplete" ? <p className="error-text">请填写完整注册信息。</p> : null}
          {!hasAdvisorInviteConfig() ? <p className="inline-message">当前未配置 `ADVISOR_INVITE_CODE`，会默认回退使用 `ADMIN_ACCESS_PASSWORD` 作为邀请码。</p> : null}

          <div className="hero-actions">
            <button className="primary-button" type="submit">
              创建顾问账号
            </button>
            <Link className="secondary-button" href="/advisor/login">
              返回顾问登录
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
