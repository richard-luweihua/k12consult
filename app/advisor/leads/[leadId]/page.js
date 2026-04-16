import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadWorkbench } from "../../../../components/LeadWorkbench";
import { getLead } from "../../../../lib/data";
import { formatAnswerSummary } from "../../../../lib/intake";
import { apiPath } from "../../../../lib/paths";

export default async function AdvisorLeadDetailPage({ params }) {
  const resolvedParams = await params;
  const { lead, consultants } = await getLead(resolvedParams.leadId);

  if (!lead) {
    notFound();
  }

  const summary = formatAnswerSummary(lead.answers);

  return (
    <main className="page-shell">
      <div className="page-topbar">
        <Link className="topbar-link" href="/advisor">← 返回线索库</Link>
        <div className="page-topbar-actions">
          <Link className="topbar-link" href={`/result/${lead.id}`}>查看用户结果页</Link>
          <form action={apiPath("/api/advisor/logout")} method="post" className="logout-form">
            <button className="secondary-button" type="submit">
              退出登录
            </button>
          </form>
        </div>
      </div>

      <section className="advisor-detail-hero card">
        <div>
          <p className="eyebrow">Lead Profile</p>
          <h1>
            {lead.answers.contactName} / {lead.answers.studentName}
          </h1>
          <p className="hero-text">{lead.result.overview}</p>
          <div className="result-meta-row advisor-result-meta-row">
            <span>{lead.channelLabel}</span>
            <span>{lead.utmCampaign || "未命名活动"}</span>
            <span>{lead.result.consultantType}</span>
          </div>
        </div>
        <div className="result-grade">
          <span>当前状态</span>
          <strong>{lead.status}</strong>
          <small>{lead.assignment.consultantName}</small>
        </div>
      </section>

      <section className="advisor-summary-grid">
        <article className="card advisor-summary-card">
          <span>综合评级</span>
          <strong>{lead.result.scores.grade}</strong>
          <small>{lead.result.scores.priority}优先级</small>
        </article>
        <article className="card advisor-summary-card">
          <span>推荐顾问</span>
          <strong>{lead.assignment.consultantName}</strong>
          <small>可在下方直接改派</small>
        </article>
        <article className="card advisor-summary-card">
          <span>最近更新时间</span>
          <strong>{new Date(lead.updatedAt).toLocaleDateString("zh-CN")}</strong>
          <small>{new Date(lead.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</small>
        </article>
      </section>

      <LeadWorkbench consultants={consultants} lead={lead} />

      <section className="result-grid">
        <article className="card">
          <p className="eyebrow">系统初判</p>
          <h2>{lead.result.primaryPathLabel}</h2>
          <p>{lead.result.pathSummary}</p>
          <ul className="plain-list">
            {lead.result.nextActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <p className="eyebrow">自动评级</p>
          <div className="score-grid">
            <div>
              <span>综合分</span>
              <strong>{lead.result.scores.composite}</strong>
            </div>
            <div>
              <span>等级</span>
              <strong>{lead.result.scores.grade}</strong>
            </div>
            <div>
              <span>优先级</span>
              <strong>{lead.result.scores.priority}</strong>
            </div>
            <div>
              <span>顾问类型</span>
              <strong>{lead.result.consultantType}</strong>
            </div>
          </div>
          <p className="inline-note">{lead.assignment.reason}</p>
        </article>
      </section>

      <section className="result-grid">
        <article className="card">
          <p className="eyebrow">渠道归因</p>
          <div className="detail-list">
            <div className="detail-item">
              <span>有效渠道</span>
              <strong>{lead.channelLabel}</strong>
            </div>
            <div className="detail-item">
              <span>UTM Source</span>
              <strong>{lead.utmSource || "未传"}</strong>
            </div>
            <div className="detail-item">
              <span>UTM Medium</span>
              <strong>{lead.utmMedium || "未传"}</strong>
            </div>
            <div className="detail-item">
              <span>UTM Campaign</span>
              <strong>{lead.utmCampaign || "未传"}</strong>
            </div>
          </div>
        </article>

        <article className="card">
          <p className="eyebrow">问卷摘要</p>
          <div className="detail-list">
            {summary.map((item) => (
              <div className="detail-item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="card">
        <p className="eyebrow">跟进记录</p>
        <div className="log-list">
          {lead.followUps.map((record) => (
            <div className="log-item" key={record.id}>
              <strong>{record.author}</strong>
              <span>{new Date(record.createdAt).toLocaleString("zh-CN")}</span>
              <p>{record.note}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
