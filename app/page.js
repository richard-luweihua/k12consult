'use client';

import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { appPath } from '@/lib/paths';
import { AttributionLink } from '../components/AttributionLink';

const valuePoints = [
  {
    title: '实时学校事实',
    description: '先看当前可申请窗口与在招状态，避免按过期信息推进。'
  },
  {
    title: '隐形门槛识别',
    description: '不只看官网条件，还识别真实筛选偏好与实操门槛。'
  },
  {
    title: '严谨规则诊断',
    description: '规则引擎先判定，再由 AI 输出建议，避免泛泛而谈。'
  },
  {
    title: '服务闭环跟进',
    description: '从报告到管理员与顾问接力，不让关键节点断在半路。'
  }
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(appPath('/dashboard'));
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <main className="home-v2">
      <header className="home-v2-header">
        <Link className="home-v2-brand" href={appPath('/')}>
          K12consult
        </Link>
        <Link className="home-v2-login-link" href={appPath('/login')}>
          登录
        </Link>
      </header>

      <section className="home-v2-hero">
        <div className="home-v2-hero-overlay">
          <p className="home-v2-eyebrow">K12 TRANSFER DECISION SYSTEM</p>
          <h1>先把转学路径判断清楚，再决定下一步。</h1>
          <p className="home-v2-subtitle">
            基于实时学校信息、规则引擎与顾问流程，给你可执行的前诊结论。
          </p>
          <div className="home-v2-actions">
            <Suspense
              fallback={
                <Link className="home-v2-primary-btn" href={appPath('/questionnaire')}>
                  开始前诊
                </Link>
              }
            >
              <AttributionLink className="home-v2-primary-btn" href={appPath('/questionnaire')}>
                开始前诊
              </AttributionLink>
            </Suspense>
          </div>
          <p className="home-v2-hint">8-12 分钟完成前诊问卷</p>
        </div>
      </section>

      <section className="home-v2-values" aria-label="核心价值">
        <div className="home-v2-values-inner">
          <h2>为什么不是通用 AI 问答</h2>
          <div className="home-v2-value-grid">
            {valuePoints.map((item) => (
              <article className="home-v2-value-item" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-v2-cta">
        <div className="home-v2-cta-inner">
          <img
            alt="顾问与家长沟通场景"
            className="home-v2-cta-image"
            src="https://images.unsplash.com/photo-1573497491765-dccce02b29df?auto=format&fit=crop&w=1200&q=80"
          />
          <div className="home-v2-cta-copy">
            <h2>先拿到一版可执行结论，再决定要不要深入咨询。</h2>
            <Suspense
              fallback={
                <Link className="home-v2-primary-btn" href={appPath('/questionnaire')}>
                  立即开始
                </Link>
              }
            >
              <AttributionLink className="home-v2-primary-btn" href={appPath('/questionnaire')}>
                立即开始
              </AttributionLink>
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
