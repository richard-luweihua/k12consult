import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, hasAdminAuthConfig, verifyAdminSessionToken } from "../../../lib/admin-auth";
import { apiPath, appPath } from "../../../lib/paths";
import { USER_SESSION_COOKIE, verifyUserSessionToken } from "../../../lib/user-auth";

function canAccessAdmin(session) {
  return Boolean(session && ["admin", "super_admin"].includes(session.role));
}

export const metadata = {
  title: "管理员登录 | 香港 K12 择校前诊 MVP"
};

export default async function AdminLoginPage({ searchParams }) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const userToken = cookieStore.get(USER_SESSION_COOKIE)?.value;
  const [adminAuthenticated, userSession] = await Promise.all([
    hasAdminAuthConfig() ? verifyAdminSessionToken(adminToken) : Promise.resolve(false),
    verifyUserSessionToken(userToken)
  ]);

  if (adminAuthenticated || canAccessAdmin(userSession)) {
    redirect(appPath("/admin/workbench"));
  }

  const params = await searchParams;
  const next = typeof params?.next === "string" && params.next.startsWith("/") ? params.next : "/admin/workbench";
  const error = params?.error;
  const loggedOut = params?.logged_out;

  return (
    <main className="page-shell auth-shell">
      <section className="card auth-card advisor-login-card">
        <div className="auth-card-header">
          <p className="advisor-brand-label">SKY MIRROR</p>
          <p className="eyebrow">Admin Access</p>
        </div>
        <h1>管理员登录</h1>
        <p className="hero-text">管理员账号用于顾问管理、Case 指派和状态推进。请输入管理员密码进入工作台。</p>

        <form action={apiPath("/api/admin/login")} className="auth-form" method="post">
          <input name="next" type="hidden" value={next} />
          <label className="field-block">
            <span className="field-label">管理员密码</span>
            <input
              autoComplete="current-password"
              className="text-input"
              name="password"
              placeholder="输入管理员密码"
              required
              type="password"
            />
          </label>

          {error === "1" ? <p className="error-text">管理员密码不正确，请重试。</p> : null}
          {loggedOut ? <p className="inline-message">你已安全退出管理员工作台。</p> : null}

          <div className="hero-actions">
            <button className="primary-button" type="submit">
              登录管理台
            </button>
            <Link className="secondary-button" href="/advisor/login">
              去顾问登录
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
