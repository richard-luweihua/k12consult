import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, hasAdminAuthConfig, verifyAdminSessionToken } from "../../../lib/admin-auth";
import { USER_SESSION_COOKIE, verifyUserSessionToken } from "../../../lib/user-auth";

function canAccessAdvisor(session) {
  return Boolean(session && ["consultant", "admin"].includes(session.role));
}

export const metadata = {
  title: "顾问工作台登录 | 香港 K12 择校前诊 MVP"
};

export default async function AdvisorLoginPage({ searchParams }) {
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
        <p className="hero-text">顾问账号现在可以独立邮箱登录。邀请码注册一次后，后续直接进入内部工作台处理线索即可。</p>

        <div className="advisor-login-points">
          <span>Lead Queue</span>
          <span>Assignment</span>
          <span>Follow-Up</span>
          <span>WeCom</span>
        </div>

        <form action="/api/auth/advisor/login" className="auth-form" method="post">
          <input name="next" type="hidden" value={next} />
          <label className="field-block">
            <span className="field-label">顾问邮箱</span>
            <input autoComplete="email" className="text-input" name="email" placeholder="your.name@company.com" required type="email" />
          </label>
          <label className="field-block">
            <span className="field-label">登录密码</span>
            <input autoComplete="current-password" className="text-input" name="password" placeholder="输入你的顾问密码" required type="password" />
          </label>

          {error === "credentials" ? <p className="error-text">邮箱或密码不正确，请重试。</p> : null}
          {error === "role" ? <p className="error-text">这个账号不是顾问账号，暂时不能进入顾问工作台。</p> : null}
          {error === "config" ? <p className="error-text">顾问账号体系还没配置完成，请先联系管理员。</p> : null}
          {loggedOut ? <p className="inline-message">你已安全退出顾问工作台。</p> : null}

          <div className="hero-actions">
            <button className="primary-button" type="submit">
              登录工作台
            </button>
            <Link className="secondary-button" href="/advisor/register">
              注册顾问账号
            </Link>
          </div>
        </form>

        {hasAdminAuthConfig() ? (
          <div className="auth-divider-block">
            <p className="eyebrow">Legacy Admin Access</p>
            <form action="/api/admin/login" className="auth-form" method="post">
              <input name="next" type="hidden" value={next} />
              <label className="field-block">
                <span className="field-label">管理员密码</span>
                <input
                  autoComplete="current-password"
                  className="text-input"
                  name="password"
                  placeholder="紧急情况下可使用管理员密码"
                  required
                  type="password"
                />
              </label>

              {error === "1" ? <p className="error-text">管理员密码不正确，请重试。</p> : null}

              <div className="hero-actions">
                <button className="secondary-button" type="submit">
                  使用管理员密码进入
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="hero-actions">
          <Link className="secondary-button" href="/">
            返回用户端
          </Link>
        </div>
      </section>
    </main>
  );
}
