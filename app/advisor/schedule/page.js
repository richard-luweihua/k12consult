import Link from "next/link";
import { cookies } from "next/headers";
import { listLeads, resolveCurrentV2Status } from "../../../lib/data";
import { isLeadAssignedToConsultant, resolveActorFromCookieStore } from "../../../lib/lead-access";

export const metadata = {
  title: "排期视图 | 顾问工作台"
};

const scheduledStatuses = new Set(["consult_assigned", "follow_up"]);
const v2StatusLabelMap = {
  consult_assigned: "已转顾问",
  follow_up: "顾问跟进中"
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
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function sameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function resolveScheduledAt(lead) {
  return lead.caseRecord?.consultationScheduledAt || lead.adminFollowUpRecord?.consultationScheduledAt || null;
}

function resolveStatusLabel(status) {
  return v2StatusLabelMap[status] || status || "-";
}

export default async function AdvisorSchedulePage() {
  const cookieStore = await cookies();
  const actor = await resolveActorFromCookieStore(cookieStore);
  const isAdminViewer = actor.role === "admin" || actor.role === "super_admin";
  const { leads } = await listLeads();

  const scopedLeads = leads
    .map((lead) => {
      const v2Status = resolveCurrentV2Status(lead);
      return {
        ...lead,
        v2Status,
        scheduledAt: resolveScheduledAt(lead)
      };
    })
    .filter((lead) => (isAdminViewer ? true : isLeadAssignedToConsultant(lead, actor.consultantKey)));

  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const scheduledItems = scopedLeads
    .filter((lead) => lead.scheduledAt && scheduledStatuses.has(lead.v2Status))
    .sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());

  const todayItems = scheduledItems.filter((lead) => {
    const time = new Date(lead.scheduledAt);
    return !Number.isNaN(time.getTime()) && sameDay(time, now);
  });

  const weekItems = scheduledItems.filter((lead) => {
    const time = new Date(lead.scheduledAt);

    if (Number.isNaN(time.getTime())) {
      return false;
    }

    return time > now && time <= weekLater && !sameDay(time, now);
  });

  const pendingSchedule = scopedLeads
    .filter((lead) => lead.v2Status === "consult_assigned" && !lead.scheduledAt)
    .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime());

  return (
    <main className="page-shell home-shell">
      <section className="hero hero--compact">
        <div className="hero-copy">
          <p className="eyebrow">Advisor Workspace</p>
          <h1>排期视图</h1>
          <p className="hero-text">把咨询安排拆成“今天、本周、待确认”，减少漏约和重复确认。</p>
          <div className="hero-actions">
            <Link className="secondary-button" href="/advisor/workbench">
              返回顾问工作台
            </Link>
            <Link className="secondary-button" href="/advisor/follow-up">
              会后跟进
            </Link>
          </div>
        </div>
      </section>

      <section className="three-column stats-grid">
        <article className="card stat-card">
          <span>今日咨询</span>
          <strong>{todayItems.length}</strong>
        </article>
        <article className="card stat-card">
          <span>7 天内排期</span>
          <strong>{weekItems.length}</strong>
        </article>
        <article className="card stat-card">
          <span>待确认时段</span>
          <strong>{pendingSchedule.length}</strong>
        </article>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Today</p>
            <h2>今天的咨询</h2>
          </div>
          <span className="inline-note">{todayItems.length} 条</span>
        </div>

        {todayItems.length === 0 ? (
          <div className="empty-state">
            <p>今天暂无已排期咨询。</p>
          </div>
        ) : (
          <div className="lead-table">
            <div className="lead-row lead-row--head">
              <span>家长 / 孩子</span>
              <span>咨询时间</span>
              <span>顾问</span>
              <span>状态</span>
              <span>操作</span>
            </div>
            {todayItems.map((lead) => (
              <div className="lead-row" key={`today-${lead.id}`}>
                <span>
                  {lead.answers.contactName || "未填写家长称呼"}
                  <small>{lead.answers.studentName || "未填写孩子称呼"}</small>
                </span>
                <span>{formatDateTime(lead.scheduledAt)}</span>
                <span>{lead.assignment?.consultantName || "待指定"}</span>
                <span>{resolveStatusLabel(lead.v2Status)}</span>
                <Link className="secondary-button" href={`/advisor/cases/${lead.id}`}>
                  打开案例
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">This Week</p>
            <h2>本周排期</h2>
          </div>
          <span className="inline-note">{weekItems.length} 条</span>
        </div>

        {weekItems.length === 0 ? (
          <div className="empty-state">
            <p>未来 7 天暂无已排期咨询。</p>
          </div>
        ) : (
          <div className="lead-table">
            <div className="lead-row lead-row--head">
              <span>家长 / 孩子</span>
              <span>咨询时间</span>
              <span>顾问</span>
              <span>最近更新</span>
              <span>操作</span>
            </div>
            {weekItems.map((lead) => (
              <div className="lead-row" key={`week-${lead.id}`}>
                <span>
                  {lead.answers.contactName || "未填写家长称呼"}
                  <small>{lead.answers.studentName || "未填写孩子称呼"}</small>
                </span>
                <span>{formatDateTime(lead.scheduledAt)}</span>
                <span>{lead.assignment?.consultantName || "待指定"}</span>
                <span>{formatDateTime(lead.updatedAt)}</span>
                <Link className="secondary-button" href={`/advisor/cases/${lead.id}`}>
                  打开案例
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Pending</p>
            <h2>待确认咨询时段</h2>
          </div>
          <span className="inline-note">{pendingSchedule.length} 条</span>
        </div>

        {pendingSchedule.length === 0 ? (
          <div className="empty-state">
            <p>当前没有待确认时段的案例。</p>
          </div>
        ) : (
          <div className="lead-table">
            <div className="lead-row lead-row--head">
              <span>家长 / 孩子</span>
              <span>顾问</span>
              <span>当前状态</span>
              <span>最近更新时间</span>
              <span>操作</span>
            </div>
            {pendingSchedule.map((lead) => (
              <div className="lead-row" key={`pending-${lead.id}`}>
                <span>
                  {lead.answers.contactName || "未填写家长称呼"}
                  <small>{lead.answers.studentName || "未填写孩子称呼"}</small>
                </span>
                <span>{lead.assignment?.consultantName || "待指定"}</span>
                <span>{resolveStatusLabel(lead.v2Status)}</span>
                <span>{formatDateTime(lead.updatedAt)}</span>
                <Link className="secondary-button" href={`/advisor/cases/${lead.id}`}>
                  去排期
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
