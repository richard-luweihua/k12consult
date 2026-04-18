import Link from "next/link";
import { listLeads, resolveCurrentV2Status } from "../../../lib/data";

export const metadata = {
  title: "培育池 | 管理员工作台"
};
export const dynamic = "force-dynamic";

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

function resolveLatestFollowUpNote(lead) {
  const notes = Array.isArray(lead.adminFollowUpRecord?.followUpNotes) ? lead.adminFollowUpRecord.followUpNotes : [];

  if (notes.length === 0) {
    return "暂无备注";
  }

  return notes[0]?.note || "暂无备注";
}

function resolveNurturingSinceDays(lead) {
  const baseTime = lead.adminFollowUpRecord?.updatedAt || lead.updatedAt;
  const start = baseTime ? new Date(baseTime).getTime() : Number.NaN;

  if (Number.isNaN(start)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - start) / (24 * 60 * 60 * 1000)));
}

export default async function AdminNurturingPage() {
  const { leads } = await listLeads();
  const nurturingLeads = leads
    .map((lead) => ({
      ...lead,
      v2Status: resolveCurrentV2Status(lead),
      nurturingDays: resolveNurturingSinceDays(lead)
    }))
    .filter((lead) => lead.v2Status === "nurturing")
    .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime());

  const staleOver7Days = nurturingLeads.filter((lead) => lead.nurturingDays >= 7).length;
  const noConsultantCount = nurturingLeads.filter((lead) => !lead.assignment?.consultantName).length;

  return (
    <main className="page-shell home-shell">
      <section className="hero hero--compact">
        <div className="hero-copy">
          <p className="eyebrow">Admin Workspace</p>
          <h1>培育池</h1>
          <p className="hero-text">集中查看暂不转顾问的案例，按更新时间复盘并选择何时重新激活。</p>
          <div className="hero-actions">
            <Link className="secondary-button" href="/admin/workbench">
              返回管理员工作台
            </Link>
            <Link className="secondary-button" href="/admin/sla">
              查看 SLA 异常
            </Link>
          </div>
        </div>
      </section>

      <section className="three-column stats-grid">
        <article className="card stat-card">
          <span>培育池总数</span>
          <strong>{nurturingLeads.length}</strong>
        </article>
        <article className="card stat-card">
          <span>超过 7 天未激活</span>
          <strong>{staleOver7Days}</strong>
        </article>
        <article className="card stat-card">
          <span>尚未绑定顾问</span>
          <strong>{noConsultantCount}</strong>
        </article>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Nurturing Queue</p>
            <h2>培育池案例列表</h2>
          </div>
          <span className="inline-note">共 {nurturingLeads.length} 条</span>
        </div>

        {nurturingLeads.length === 0 ? (
          <div className="empty-state">
            <p>当前没有培育池案例，管理员工作台标记“进入培育池”后会在这里出现。</p>
          </div>
        ) : (
          <div className="lead-table">
            <div className="lead-row lead-row--head">
              <span>家长 / 孩子</span>
              <span>培育时长</span>
              <span>顾问</span>
              <span>最近备注</span>
              <span>最近更新时间</span>
              <span>操作</span>
            </div>

            {nurturingLeads.map((lead) => (
              <div className="lead-row" key={lead.id}>
                <span>
                  {lead.answers.contactName || "未填写家长称呼"}
                  <small>{lead.answers.studentName || "未填写孩子称呼"}</small>
                </span>
                <span>
                  {lead.nurturingDays} 天
                  <small>{lead.nurturingDays >= 7 ? "建议复查激活" : "在观察窗口内"}</small>
                </span>
                <span>
                  {lead.assignment?.consultantName || "待指定"}
                  <small>{lead.assignment?.focusLabel || "暂无顾问标签"}</small>
                </span>
                <span>
                  {resolveLatestFollowUpNote(lead)}
                  <small>{lead.adminFollowUpRecord?.handoffSummary || "无交接摘要"}</small>
                </span>
                <span>{formatDateTime(lead.updatedAt)}</span>
                <Link className="secondary-button" href={`/admin/cases/${lead.id}`}>
                  重新激活
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
