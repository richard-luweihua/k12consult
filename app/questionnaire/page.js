'use client';

import Link from "next/link";
import { Suspense } from "react";
import { useAuth } from "@/lib/auth-context";
import { appPath } from "@/lib/paths";
import { QuestionnaireForm } from "../../components/QuestionnaireForm";

export default function QuestionnairePage() {
  const { user, loading } = useAuth();
  const loginHref = user ? appPath("/dashboard") : appPath("/login");
  const loginLabel = loading ? "加载中..." : user ? "进入进展" : "登录";

  return (
    <main className="questionnaire-v2">
      <header className="questionnaire-v2-topbar">
        <Link className="questionnaire-v2-link" href={appPath("/")}>
          返回首页
        </Link>
        <Link className="questionnaire-v2-link" href={loginHref}>
          {loginLabel}
        </Link>
      </header>

      <section className="questionnaire-v2-header">
        <h1>填写信息，生成诊断报告</h1>
        <p>预计 5-10 分钟，请按实际情况填写。</p>
      </section>

      <Suspense
        fallback={
          <section className="questionnaire-v2-loading">
            <p>正在加载问卷...</p>
          </section>
        }
      >
        <QuestionnaireForm />
      </Suspense>
    </main>
  );
}
