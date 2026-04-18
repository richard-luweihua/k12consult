import Link from "next/link";
import { cookies } from "next/headers";
import { listLeads, resolveCurrentV2Status } from "../../../lib/data";
import { isLeadAssignedToConsultant, resolveActorFromCookieStore } from "../../../lib/lead-access";

export const metadata = {
  title: "会后跟进 | 顾问工作台"
};

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function resolvePostConsultation(lead) {
  return lead.caseRecord?.postConsultation || {};
}

function resolveLatestFollowUpAt(lead) {
  const notes = Array.isArray(lead.followUps) ? lead.followUps : [];

  if (notes.length === 0) {
    return null;
  }

  return notes[0]?.createdAt || null;
}

export default async function AdvisorFollowUpPage() {
  const cookieStore = await cookies();
  const actor = await resolveActorFromCookieStore(cookieStore);
  const isAdminViewer = actor.role === "admin" || actor.role === "super_admin";
  const { leads } = await listLeads();

  const scopedLeads = leads
    .map((lead) => {
      const v2Status = resolveCurrentV2Status(lead);
      const postConsultation = resolvePostConsultation(lead);

      return {
        ...lead,
        v2Status,
        postConsultation,
        latestFollowUpAt: resolveLatestFollowUpAt(lead)
      };
    })
    .filter((lead) => (isAdminViewer ? true : isLeadAssignedToConsultant(lead, actor.consultantKey)));

  const activeFollowUps = scopedLeads
    .filter((lead) => lead.v2Status === "follow_up")
    .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime());

  const pendingMoveToFollowUp = scopedLeads
    .filter((lead) => lead.v2Status === "consult_assigned")
    .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime());

  return (
    <main className="page-shell home-shell">
      <section className="hero hero--compact">
        <div className="hero-copy">
          <p className="eyebrow">Advisor Workspace</p>
          <h1>会后跟进</h1>
          <p className="hero-text">统一管理咨询后的下一步动作、责任人和回访记录，避免结论停留在报告层。</p>
          <div className="hero-actions">
            <Link className="secondary-button" href="/advisor/workbench">
              返回顾问工作台
            </Link>
            <Link className="secondary-button" href="/advisor/schedule">
              排期视图
            </Link>
          </div>
        </div>
      </section>

      <section className="three-column stats-grid">
        <article className="card stat-card">
          <span>会后跟进中</span>
          <strong>{activeFollowUps.length}</strong>
        </article>
        <article className="card stat-card">
          <span>待启动跟进</span>
          <strong>{pendingMoveToFollowUp.length}</strong>
        </article>
        <article className="card stat-card">
          <span>需顾问动作总数</span>
          <strong>{activeFollowUps.length + pendingMoveToFollowUp.length}</strong>
        </article>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Follow-Up Active</p>
            <h2>正在跟进的案例</h2>
          </div>
          <span className="inline-note">{activeFollowUps.length} 条</span>
        </div>

        {activeFollowUps.length === 0 ? (
          <div className="empty-state">
            <p>当前没有“咨询后跟进”状态的案例。</p>
          </div>
        ) : (
          <div className="lead-table">
            <div className="lead-row lead-row--head">
              <span>家长 / 孩子</span>
              <span>下一步动作</span>
              <span>负责人</span>
              <span>最近跟进记录</span>
              <span>操作</span>
            </div>
            {activeFollowUps.map((lead) => (
              <div className="lead-row" key={`active-follow-up-${lead.id}`}>
                <span>
                  {lead.answers.contactName || "未填写家长称呼"}
                  <small>{lead.answers.studentName || "未填写孩子称呼"}</small>
                </span>
                <span>
                  {lead.postConsultation.nextStep || "待填写下一步动作"}
                  <small>{lead.postConsultation.summary || "待补充会后摘要"}</small>
                </span>
                <span>{lead.postConsultation.owner || lead.assignment?.consultantName || "待指定"}</span>
                <span>
                  {formatDateTime(lead.latestFollowUpAt || lead.updatedAt)}
                  <small>{lead.latestFollowUpAt ? "来自跟进记录" : "来自案例更新时间"}</small>
                </span>
                <Link className="secondary-button" href={`/advisor/cases/${lead.id}`}>
                  继续跟进
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Need Action</p>
            <h2>已派单但未启动跟进</h2>
          </div>
          <span className="inline-note">{pendingMoveToFollowUp.length} 条</span>
        </div>

        {pendingMoveToFollowUp.length === 0 ? (
          <div className="empty-state">
            <p>当前没有待启动跟进的案例。</p>
          </div>
        ) : (
          <div className="lead-table">
            <div className="lead-row lead-row--head">
              <span>家长 / 孩子</span>
              <span>交接时间</span>
              <span>顾问</span>
              <span>最近更新时间</span>
              <span>操作</span>
            </div>
            {pendingMoveToFollowUp.map((lead) => (
              <div className="lead-row" key={`pending-follow-up-${lead.id}`}>
                <span>
                  {lead.answers.contactName || "未填写家长称呼"}
                  <small>{lead.answers.studentName || "未填写孩子称呼"}</small>
                </span>
                <span>{formatDateTime(lead.caseRecord?.updatedAt || lead.adminFollowUpRecord?.updatedAt)}</span>
                <span>{lead.assignment?.consultantName || "待指定"}</span>
                <span>{formatDateTime(lead.updatedAt)}</span>
                <Link className="secondary-button" href={`/advisor/cases/${lead.id}`}>
                  启动跟进
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
