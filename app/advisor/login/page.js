import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, hasAdminAuthConfig, verifyAdminSessionToken } from "../../../lib/admin-auth";

export const metadata = {
  title: "顾问工作台登录 | 香港 K12 择校前诊 MVP"
};

export default async function AdvisorLoginPage({ searchParams }) {
  if (!hasAdminAuthConfig()) {
    redirect("/advisor");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const authenticated = await verifyAdminSessionToken(token);

  if (authenticated) {
    redirect("/advisor");
  }

  const params = await searchParams;
  const error = params?.error;
  const loggedOut = params?.logged_out;
  const next = params?.next || "/advisor";

  return (
    <main className="page-shell auth-shell">
      <section className="card auth-card advisor-login-card">
        <div className="auth-card-header">
          <p className="advisor-brand-label">SKY MIRROR</p>
          <p className="eyebrow">Advisor Access</p>
        </div>
        <h1>顾问工作台登录</h1>
        <p className="hero-text">这是内部工作平台。授权的顾问可在此管理线索池、推进状态、发送通知与沉淀跟进记录。</p>

        <div className="advisor-login-points">
          <span>📋 Lead Queue</span>
          <span>👥 Assignment</span>
          <span>📝 Follow-Up</span>
          <span>💬 WeCom</span>
        </div>

        <form action="/api/admin/login" className="auth-form" method="post">
          <input name="next" type="hidden" value={next} />
          <label className="field-block">
            <span className="field-label">管理员密码</span>
            <input
              autoComplete="current-password"
              className="text-input"
              name="password"
              placeholder="输入 ADMIN_ACCESS_PASSWORD"
              required
              type="password"
            />
          </label>

          {error ? <p className="error-text">密码不正确，请重试。</p> : null}
          {loggedOut ? <p className="inline-message">你已安全退出顾问工作台。</p> : null}

          <div className="hero-actions">
            <button className="primary-button" type="submit">
              登录工作台
            </button>
            <Link className="secondary-button" href="/">
              返回用户端
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
