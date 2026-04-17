'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { appPath } from '@/lib/paths';
import { AttributionLink } from '../components/AttributionLink';

export default function HomePage() {
  const { user, loading } = useAuth();
  const primaryHref = user ? appPath('/dashboard') : appPath('/questionnaire');
  const loginHref = user ? appPath('/dashboard') : appPath('/login');

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <main className="home-v2">
      <header className="home-v2-topbar">
        <Link className="home-v2-login-link" href={loginHref}>
          {user ? '进入进展' : '登录'}
        </Link>
      </header>

      <section className="home-v2-center">
        <h1>香港留学插班一键规划</h1>
        <p className="home-v2-values-inline">实时学校信息 · 隐形门槛识别 · 严谨规则诊断 · 服务闭环跟进</p>

        {user ? (
          <Link className="home-v2-primary-btn" href={primaryHref}>
            开始AI诊断
          </Link>
        ) : (
          <Suspense
            fallback={
              <a className="home-v2-primary-btn" href={primaryHref}>
                开始AI诊断
              </a>
            }
          >
            <AttributionLink className="home-v2-primary-btn" href={primaryHref}>
              开始AI诊断
            </AttributionLink>
          </Suspense>
        )}

        <p className="home-v2-hint">5-10分钟完成</p>
      </section>

      <footer className="home-v2-footer-note">
        Sky Mirror提供AI诊断服务 小红书账号:竺院爸爸在香港 (小红书号 hk_zhuyan_dad) | 企业微信:竺院爸爸小助理
      </footer>
    </main>
  );
}
