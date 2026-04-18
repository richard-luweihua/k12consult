import Link from "next/link";
import { listLeads, resolveCurrentV2Status } from "../../../lib/data";
import { resolveAwaitingInfoAnomaly, resolveFirstContactAnomaly } from "../../../lib/admin-sla";

export const metadata = {
  title: "SLA 异常清单 | 管理员工作台"
};
export const dynamic = "force-dynamic";

const firstContactSlaMinutes = 120;

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

function formatMinutes(minutes) {
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (rest === 0) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${rest} 分钟`;
}

function resolveMissingInfoSummary(lead) {
  const missingInfo = lead.adminFollowUpRecord?.missingInfo;

  if (Array.isArray(missingInfo)) {
    return missingInfo.length > 0 ? missingInfo.join("、") : "未标记缺失项";
  }

  if (typeof missingInfo === "string" && missingInfo.trim()) {
    return missingInfo.trim();
  }

  return "未标记缺失项";
}

export default async function AdminSlaPage() {
  const { leads } = await listLeads();
  const leadsWithStatus = leads.map((lead) => ({
    ...lead,
    v2Status: resolveCurrentV2Status(lead)
  }));

  const firstContactAnomalies = leadsWithStatus
    .map((lead) => {
      const anomaly = resolveFirstContactAnomaly(lead, { slaMinutes: firstContactSlaMinutes });
      return anomaly ? { lead, anomaly } : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.anomaly.overtimeMinutes - left.anomaly.overtimeMinutes);

  const awaitingInfoAnomalies = leadsWithStatus
    .map((lead) => {
      const anomaly = resolveAwaitingInfoAnomaly(lead, { thresholdDays: 7 });
      return anomaly ? { lead, anomaly } : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.anomaly.waitDays - left.anomaly.waitDays);

  return (
    <main className="page-shell home-shell">
      <section className="hero hero--compact">
        <div className="hero-copy">
          <p className="eyebrow">Admin Workspace</p>
          <h1>SLA 异常清单</h1>
          <p className="hero-text">重点关注“首次联系超时”和“补资料等待超时”，优先处理高风险案例。</p>
          <div className="hero-actions">
            <Link className="secondary-button" href="/admin/workbench">
              返回管理员工作台
            </Link>
            <Link className="secondary-button" href="/admin/nurturing">
              前往培育池
            </Link>
          </div>
        </div>
      </section>

      <section className="three-column stats-grid">
        <article className="card stat-card">
          <span>首次联系异常</span>
          <strong>{firstContactAnomalies.length}</strong>
        </article>
        <article className="card stat-card">
          <span>补资料超 7 天</span>
          <strong>{awaitingInfoAnomalies.length}</strong>
        </article>
        <article className="card stat-card">
          <span>总异常数</span>
          <strong>{firstContactAnomalies.length + awaitingInfoAnomalies.length}</strong>
        </article>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">First Contact SLA</p>
            <h2>首次联系超时案例</h2>
          </div>
          <span className="inline-note">SLA 目标：2 小时内首次联系</span>
        </div>

        {firstContactAnomalies.length === 0 ? (
          <div className="empty-state">
            <p>当前没有首次联系超时案例。</p>
          </div>
        ) : (
          <div className="lead-table">
            <div className="lead-row lead-row--head">
              <span>家长 / 孩子</span>
              <span>咨询意向提交</span>
              <span>首次联系</span>
              <span>超时时长</span>
              <span>操作</span>
            </div>
            {firstContactAnomalies.map(({ lead, anomaly }) => (
              <div className="lead-row" key={`first-contact-${lead.id}`}>
                <span>
                  {lead.answers.contactName || "未填写家长称呼"}
                  <small>{lead.answers.studentName || "未填写孩子称呼"}</small>
                </span>
                <span>{formatDateTime(anomaly.submittedAt)}</span>
                <span>
                  {anomaly.firstContactAt ? formatDateTime(anomaly.firstContactAt) : "未记录"}
                  <small>{anomaly.mode === "still_pending" ? "仍未联系" : "已联系但超时"}</small>
                </span>
                <span style={{ color: "#b42318" }}>{formatMinutes(anomaly.overtimeMinutes)}</span>
                <Link className="secondary-button" href={`/admin/cases/${lead.id}`}>
                  立即处理
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Awaiting Info SLA</p>
            <h2>补资料等待超时案例</h2>
          </div>
          <span className="inline-note">规则：等待补资料超过 7 天</span>
        </div>

        {awaitingInfoAnomalies.length === 0 ? (
          <div className="empty-state">
            <p>当前没有补资料等待超时案例。</p>
          </div>
        ) : (
          <div className="lead-table">
            <div className="lead-row lead-row--head">
              <span>家长 / 孩子</span>
              <span>当前状态</span>
              <span>等待时长</span>
              <span>最后一次更新</span>
              <span>操作</span>
            </div>
            {awaitingInfoAnomalies.map(({ lead, anomaly }) => (
              <div className="lead-row" key={`awaiting-info-${lead.id}`}>
                <span>
                  {lead.answers.contactName || "未填写家长称呼"}
                  <small>{lead.answers.studentName || "未填写孩子称呼"}</small>
                </span>
                <span>
                  待补资料
                  <small>{resolveMissingInfoSummary(lead)}</small>
                </span>
                <span style={{ color: "#b42318" }}>{anomaly.waitDays} 天</span>
                <span>{formatDateTime(anomaly.baseTime)}</span>
                <Link className="secondary-button" href={`/admin/cases/${lead.id}`}>
                  去催资料
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
