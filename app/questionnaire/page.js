'use client';

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { QuestionnaireForm } from "../../components/QuestionnaireForm";

export default function QuestionnairePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="page-shell">
      <div className="page-topbar">
        <Link href="/dashboard">返回仪表板</Link>
      </div>

      <section className="hero hero--compact">
        <div className="hero-copy">
          <p className="eyebrow">Structured Intake</p>
          <h1>这不是普通留资表单，而是一份前端诊断问卷。</h1>
          <p className="hero-text">
            我们先把影响路径判断的变量一次性收齐，再由系统给出路径初判、风险提示和下一步建议，让后续沟通直接进入重点。
          </p>
        </div>

        <div className="hero-panel hero-panel--compact">
          <div className="metric-row metric-row--compact">
            <div>
              <strong>8-12 分钟</strong>
              <span>建议一次完成</span>
            </div>
            <div>
              <strong>即时生成</strong>
              <span>结果页与后续跟进建议</span>
            </div>
          </div>
          <div className="hero-note hero-note--executive">
            <p>Before You Start</p>
            <span>准备好孩子当前年级、语言基础、预算范围、身份条件和预期切入时间，会让结果更准确。</span>
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <section className="card survey-section">
            <p>正在加载问卷...</p>
          </section>
        }
      >
        <QuestionnaireForm />
      </Suspense>
    </main>
  );
}
