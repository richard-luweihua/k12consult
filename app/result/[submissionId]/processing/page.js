"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { appPath } from "@/lib/paths";

const phases = [
  "正在整理问卷输入",
  "正在执行规则判定",
  "正在生成诊断草稿"
];

export default function ResultProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const submissionId = params?.submissionId ? String(params.submissionId) : "";

  useEffect(() => {
    if (!submissionId) {
      return;
    }

    setTimedOut(false);

    const phaseTimer = window.setInterval(() => {
      setPhaseIndex((current) => (current + 1 >= phases.length ? current : current + 1));
    }, 850);

    const redirectTimer = window.setTimeout(() => {
      router.replace(appPath(`/result/${submissionId}`));
    }, 2800);

    const timeoutTimer = window.setTimeout(() => {
      setTimedOut(true);
    }, 6000);

    return () => {
      window.clearInterval(phaseTimer);
      window.clearTimeout(redirectTimer);
      window.clearTimeout(timeoutTimer);
    };
  }, [submissionId, router]);

  return (
    <main className="page-shell">
      <div className="page-topbar">
        <Link href="/questionnaire">返回问卷</Link>
      </div>

      <section className="hero hero--compact">
        <div className="hero-copy">
          <p className="eyebrow">V2 Report Engine</p>
          <h1>报告生成中</h1>
          <p className="hero-text">系统正在根据你刚刚提交的信息生成 V2 诊断草稿，通常只需要几秒钟。</p>
        </div>
      </section>

      <section className="card survey-section">
        <div className="section-header">
          <p className="eyebrow">当前阶段</p>
          <p>{phases[phaseIndex]}</p>
        </div>

        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${((phaseIndex + 1) / phases.length) * 100}%` }} />
        </div>
        <p className="progress-copy">已完成 {Math.round(((phaseIndex + 1) / phases.length) * 100)}%</p>

        {timedOut ? (
          <p className="inline-note">生成时间比预期更久，你可以先直接查看已生成内容，或重试一次生成流程。</p>
        ) : (
          <p className="inline-note">通常 2-3 秒内自动跳转到结果页。</p>
        )}

        <div className="hero-actions">
          <Link className="secondary-button" href={appPath(`/result/${submissionId}`)}>
            立即查看结果
          </Link>
          {timedOut ? (
            <Link className="primary-button" href={appPath(`/result/${submissionId}/processing?retry=${Date.now()}`)}>
              重试生成流程
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
