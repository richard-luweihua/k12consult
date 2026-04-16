'use client';

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiPath } from "@/lib/paths";
import { usePermissions } from "@/lib/permissions";

function scoreLabel(score) {
  return `${score} / 5`;
}

export default function ResultPage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { canViewOwnLeads, canViewAssignedLeads, canViewAllLeads } = usePermissions();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    async function fetchLead() {
      if (!params?.submissionId) return;

      try {
        const response = await fetch(apiPath(`/api/results/${params.submissionId}`), {
          cache: "no-store"
        });

        if (response.status === 404) {
          setLead(null);
          return;
        }

        if (!response.ok) {
          throw new Error("获取结果失败");
        }

        const { lead: leadData } = await response.json();
        setLead(leadData);
      } catch (error) {
        console.error('Error fetching lead:', error);
        setFetchError(error instanceof Error ? error.message : "获取结果失败");
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchLead();
    }
  }, [params?.submissionId, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">请先登录</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">{fetchError || "未找到对应结果"}</div>
      </div>
    );
  }

  // 权限检查
  const consultantKey = user.consultant_id || user.consultantId || user.id;
  const canView = (
    (canViewOwnLeads && lead.userId === user.id) ||
    canViewAllLeads ||
    (canViewAssignedLeads && lead.assignedConsultantId === consultantKey)
  );

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">无权限查看此结果</div>
      </div>
    );
  }

  const { result, answers, assignment } = lead;

  return (
    <main className="page-shell">
      <div className="page-topbar">
        <Link href="/dashboard">返回仪表板</Link>
        <div className="page-topbar-actions">
          <Link href="/questionnaire">重新填写</Link>
        </div>
      </div>

      <section className="result-hero result-hero--executive">
        <div>
          <p className="eyebrow">Preliminary Advisory View</p>
          <h1>{result.primaryPathLabel}</h1>
          <p className="hero-text">{result.overview}</p>
          <div className="result-meta-row">
            <span>{answers.studentName}</span>
            <span>{answers.location}</span>
            <span>{result.consultantType}</span>
          </div>
        </div>
        <div className="result-grade">
          <span>综合评级</span>
          <strong>{result.scores.grade}</strong>
          <small>跟进优先级：{result.scores.priority}</small>
        </div>
      </section>

      <section className="result-grid">
        <article className="card insight-card">
          <p className="eyebrow">路径初判</p>
          <h2>{result.primaryPathLabel}</h2>
          <p>{result.pathSummary}</p>
          <p className="inline-note">系统已结合当前地区、年级与推进窗口给出首轮方向判断，后续仍建议做一轮真人细化。</p>
        </article>

        <article className="card insight-card">
          <p className="eyebrow">四维评分</p>
          <div className="score-grid">
            <div>
              <span>紧迫度</span>
              <strong>{scoreLabel(result.scores.urgency)}</strong>
            </div>
            <div>
              <span>预算</span>
              <strong>{scoreLabel(result.scores.budget)}</strong>
            </div>
            <div>
              <span>意向度</span>
              <strong>{scoreLabel(result.scores.intent)}</strong>
            </div>
            <div>
              <span>复杂度</span>
              <strong>{scoreLabel(result.scores.complexity)}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="result-grid">
        <article className="card insight-card">
          <p className="eyebrow">主要风险点</p>
          <ul className="plain-list">
            {result.riskTags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        </article>

        <article className="card insight-card">
          <p className="eyebrow">建议下一步</p>
          <ul className="plain-list">
            {result.nextActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card cta-panel cta-panel--executive">
        <div>
          <p className="eyebrow">Assigned Follow-Up</p>
          <h2>如果你准备继续推进，建议尽快完成一次 1v1 深度沟通。</h2>
          <p>基于当前判断，系统建议由 {assignment.consultantName} 跟进。{assignment.reason}</p>
        </div>
        <div className="hero-actions">
          <Link className="primary-button" href="/questionnaire">
            再做一份前诊
          </Link>
          <Link className="secondary-button" href="/">
            返回首页
          </Link>
        </div>
      </section>
    </main>
  );
}
