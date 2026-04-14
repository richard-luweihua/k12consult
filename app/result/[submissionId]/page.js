import Link from "next/link";
import { notFound } from "next/navigation";
import { getLead } from "../../../lib/data";

function scoreLabel(score) {
  return `${score} / 5`;
}

export default async function ResultPage({ params }) {
  const resolvedParams = await params;
  const { lead } = await getLead(resolvedParams.submissionId);

  if (!lead) {
    notFound();
  }

  const { result, answers, assignment } = lead;

  return (
    <main className="page-shell">
      <div className="page-topbar">
        <Link href="/">返回落地页</Link>
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
