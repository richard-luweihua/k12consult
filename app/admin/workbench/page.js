import Link from "next/link";
import { listLeads } from "../../../lib/data";
import { apiPath } from "../../../lib/paths";

const v2StatusLabelMap = {
  report_viewed: "报告已查看，待咨询意向",
  consult_intent_submitted: "已提交咨询意向",
  admin_following: "管理员跟进中",
  awaiting_user_info: "待补资料",
  consult_ready_for_assignment: "可转顾问",
  consult_assigned: "已转顾问",
  follow_up: "顾问跟进中",
  nurturing: "培育池",
  closed: "成交关闭"
};

const filterOptions = [
  ["all", "全部状态"],
  ["report_viewed", "报告已查看"],
  ["consult_intent_submitted", "咨询意向已提交"],
  ["admin_following", "管理员跟进中"],
  ["awaiting_user_info", "待补资料"],
  ["consult_ready_for_assignment", "可转顾问"],
  ["consult_assigned", "已转顾问"],
  ["follow_up", "顾问跟进中"],
  ["nurturing", "培育池"],
  ["closed", "成交关闭"]
];
const intentLevelLabelMap = {
  high: "高意愿",
  medium: "中意愿",
  low: "低意愿"
};
const budgetLevelLabelMap = {
  local_oriented: "本地导向预算",
  medium_private: "中等私立/直资预算",
  international: "国际学校预算",
  unspecified: "暂未明确"
};

const firstContactSlaMinutes = 120;

function formatMinutes(minutes) {
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (restMinutes === 0) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${restMinutes} 分钟`;
}

function resolveFirstContactSla(lead) {
  if (lead.consultationRequest?.requestStatus !== "submitted") {
    return { label: "未提交咨询意向", tone: "normal" };
  }

  const submittedAt = lead.consultationRequest?.submittedAt || lead.createdAt;
  const record = lead.adminFollowUpRecord || {};
  const submittedTime = submittedAt ? new Date(submittedAt).getTime() : Number.NaN;

  if (Number.isNaN(submittedTime)) {
    return { label: "未开始计时", tone: "normal" };
  }

  const firstContactTime = record.firstContactAt ? new Date(record.firstContactAt).getTime() : Number.NaN;

  if (!Number.isNaN(firstContactTime)) {
    const spentMinutes = Math.max(0, Math.round((firstContactTime - submittedTime) / 60000));

    if (spentMinutes <= firstContactSlaMinutes) {
      return { label: `已在 ${formatMinutes(spentMinutes)} 内联系`, tone: "ok" };
    }

    return { label: `首次联系超时 ${formatMinutes(spentMinutes - firstContactSlaMinutes)}`, tone: "warn" };
  }

  const deadline = submittedTime + firstContactSlaMinutes * 60 * 1000;
  const deltaMinutes = Math.ceil((deadline - Date.now()) / 60000);

  if (deltaMinutes >= 0) {
    return { label: `剩余 ${formatMinutes(deltaMinutes)}`, tone: "normal" };
  }

  return { label: `已超时 ${formatMinutes(Math.abs(deltaMinutes))}`, tone: "warn" };
}

function resolveAwaitingInfoAge(lead) {
  if (lead.v2Status !== "awaiting_user_info") {
    return { label: "-", tone: "normal" };
  }

  const baseTime = lead.adminFollowUpRecord?.updatedAt || lead.updatedAt;
  const start = baseTime ? new Date(baseTime).getTime() : Number.NaN;

  if (Number.isNaN(start)) {
    return { label: "等待中", tone: "normal" };
  }

  const days = Math.max(0, Math.floor((Date.now() - start) / (24 * 60 * 60 * 1000)));

  if (days >= 7) {
    return { label: `${days} 天（超 7 天）`, tone: "warn" };
  }

  return { label: `${days} 天`, tone: "normal" };
}

function withLabel(map, value, fallback) {
  if (!value) {
    return fallback;
  }

  return map[value] || value;
}

function resolveV2Status(lead) {
  const explicit = lead.caseRecord?.status || lead.adminFollowUpRecord?.status;

  if (explicit) {
    return explicit;
  }

  if (lead.status === "已关闭") {
    return "closed";
  }

  if (lead.status === "暂不跟进") {
    return "nurturing";
  }

  if (lead.status === "已转化") {
    return "closed";
  }

  if (lead.status === "已派单") {
    return "consult_assigned";
  }

  if (lead.status === "顾问已接收") {
    return "follow_up";
  }

  if (lead.status === "跟进中") {
    return "admin_following";
  }

  return "report_viewed";
}

function linkForFilter(filterKey) {
  return filterKey === "all" ? "/admin/workbench" : `/admin/workbench?v2Status=${filterKey}`;
}

export const metadata = {
  title: "管理员工作台 | 香港 K12 择校前诊 MVP"
};

export default async function AdminPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const requestedStatus =
    typeof resolvedSearchParams?.v2Status === "string" && resolvedSearchParams.v2Status.trim()
      ? resolvedSearchParams.v2Status.trim()
      : "all";
  const availableFilterKeys = new Set(filterOptions.map(([key]) => key));
  const selectedStatus = availableFilterKeys.has(requestedStatus) ? requestedStatus : "all";
  const { leads } = await listLeads();
  const leadsWithStatus = leads.map((lead) => ({
    ...lead,
    v2Status: resolveV2Status(lead)
  }));
  const counts = leadsWithStatus.reduce(
    (acc, lead) => {
      acc.all += 1;
      acc[lead.v2Status] = (acc[lead.v2Status] || 0) + 1;
      return acc;
    },
    { all: 0 }
  );
  const visibleLeads =
    selectedStatus === "all" ? leadsWithStatus : leadsWithStatus.filter((lead) => lead.v2Status === selectedStatus);
  const selectedStatusLabel = filterOptions.find(([key]) => key === selectedStatus)?.[1] || "当前筛选";
  const selectedStatusCount = counts[selectedStatus] || 0;

  return (
    <main className="page-shell home-shell">
      <section className="hero hero--compact">
        <div className="hero-copy">
          <p className="eyebrow">Admin Workspace</p>
          <h1>管理员跟进台</h1>
          <p className="hero-text">先筛选意向和资料完整度，再决定转顾问、补资料或进入培育池。</p>
          <div className="hero-actions">
            <Link className="secondary-button" href="/admin/consultants">
              管理顾问
            </Link>
            <Link className="secondary-button" href="/admin/cases">
              Case 总览与指派
            </Link>
            <Link className="secondary-button" href="/admin/nurturing">
              培育池
            </Link>
            <Link className="secondary-button" href="/admin/sla">
              SLA 异常
            </Link>
            <Link className="secondary-button" href="/advisor/workbench">
              切换顾问视角
            </Link>
            <form action={apiPath("/api/admin/logout")} method="post">
              <button className="secondary-button" type="submit">
                退出登录
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="three-column stats-grid">
        <article className="card stat-card">
          <span>模块 1</span>
          <strong>管理顾问</strong>
          <Link className="secondary-button" href="/admin/consultants">
            进入
          </Link>
        </article>
        <article className="card stat-card">
          <span>模块 2</span>
          <strong>Case 总览与指派</strong>
          <Link className="secondary-button" href="/admin/cases">
            进入
          </Link>
        </article>
        <article className="card stat-card">
          <span>模块 3</span>
          <strong>Case 状态管理</strong>
          <Link className="secondary-button" href="/admin/workbench">
            当前页面
          </Link>
        </article>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">状态看板</p>
            <h2>按 V2.0 跟进状态筛选案例</h2>
          </div>
          <span className="inline-note">
            当前筛选：{selectedStatusLabel} · {selectedStatusCount} 条
          </span>
        </div>

        <form action="/admin/workbench" className="status-filter-compact" method="get">
          <label className="field-block">
            <span className="field-label">选择要查看的案例状态</span>
            <div className="status-filter-controls">
              <select className="select-input status-filter-select" defaultValue={selectedStatus} name="v2Status">
                {filterOptions.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}（{counts[key] || 0} 条）
                  </option>
                ))}
              </select>
              <button className="secondary-button" type="submit">
                查看案例
              </button>
              {selectedStatus !== "all" ? (
                <Link className="secondary-button" href="/admin/workbench">
                  重置
                </Link>
              ) : null}
            </div>
          </label>
        </form>

        <div className="status-chip-scroll" role="list" aria-label="状态快捷筛选">
          {filterOptions.map(([key, label]) => {
            const isActive = key === selectedStatus;
            return (
              <Link
                className={isActive ? "status-chip-link status-chip-link--active" : "status-chip-link"}
                href={linkForFilter(key)}
                key={key}
                role="listitem"
              >
                <span>{label}</span>
                <strong>{counts[key] || 0}</strong>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Follow-Up Queue</p>
            <h2>管理员待处理案例</h2>
          </div>
          <span className="inline-note">当前 {visibleLeads.length} 条</span>
        </div>

        {visibleLeads.length === 0 ? (
          <div className="empty-state">
            <p>当前筛选下没有案例，调整状态筛选即可继续查看。</p>
          </div>
        ) : (
          <div className="lead-table">
            <div className="lead-row lead-row--head">
              <span>家长 / 孩子</span>
              <span>V2.0 状态</span>
              <span>咨询意愿</span>
              <span>预算接受度</span>
              <span>首次联系 SLA</span>
              <span>补资料等待</span>
              <span>最近更新</span>
              <span>操作</span>
            </div>
            {visibleLeads.map((lead) => {
              const sla = resolveFirstContactSla(lead);
              const awaitingInfo = resolveAwaitingInfoAge(lead);
              const slaStyle =
                sla.tone === "warn"
                  ? { color: "#b42318" }
                  : sla.tone === "ok"
                    ? { color: "#166534" }
                    : undefined;
              const awaitingInfoStyle = awaitingInfo.tone === "warn" ? { color: "#b42318" } : undefined;

              return (
                <div className="lead-row" key={lead.id}>
                  <span>
                    {lead.answers.contactName}
                    <small>{lead.answers.studentName}</small>
                  </span>
                  <span>
                    {v2StatusLabelMap[lead.v2Status] || lead.v2Status}
                    <small>{lead.status}</small>
                  </span>
                  <span>{withLabel(intentLevelLabelMap, lead.adminFollowUpRecord?.intentLevel, "未评估")}</span>
                  <span>{withLabel(budgetLevelLabelMap, lead.adminFollowUpRecord?.budgetLevel, "未标记")}</span>
                  <span style={slaStyle}>
                    {sla.label}
                    <small>
                      {lead.adminFollowUpRecord?.firstContactAt
                        ? new Date(lead.adminFollowUpRecord.firstContactAt).toLocaleString("zh-CN")
                        : "未记录首次联系时间"}
                    </small>
                  </span>
                  <span style={awaitingInfoStyle}>{awaitingInfo.label}</span>
                  <span>
                    {new Date(lead.updatedAt).toLocaleDateString("zh-CN")}
                    <small>{new Date(lead.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</small>
                  </span>
                  <Link className="secondary-button" href={`/admin/cases/${lead.id}`}>
                    进入跟进
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
