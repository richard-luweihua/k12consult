import Link from "next/link";
import { WeComTester } from "../../components/WeComTester";
import { listLeads } from "../../lib/data";
import { diagnoseWeCom } from "../../lib/notifications";
import { apiPath } from "../../lib/paths";
import { diagnoseSupabase } from "../../lib/supabase";
import { buildLeadStats } from "../../lib/tracking";

export const metadata = {
  title: "顾问工作台 | 香港 K12 择校前诊 MVP"
};

const v2StatusLabelMap = {
  report_viewed: "报告已查看，待咨询意向",
  consult_intent_submitted: "已提交咨询意向",
  admin_following: "管理员跟进中",
  awaiting_user_info: "待补资料",
  consult_ready_for_assignment: "可转顾问",
  consult_assigned: "已转顾问",
  consult_scheduled: "咨询已排期",
  consult_completed: "咨询已完成",
  follow_up: "咨询后跟进",
  nurturing: "培育池",
  closed: "已关闭"
};

const v2StatusOptions = [
  { key: "all", label: "全部状态" },
  { key: "report_viewed", label: "报告已查看" },
  { key: "consult_intent_submitted", label: "咨询意向已提交" },
  { key: "admin_following", label: "管理员跟进中" },
  { key: "awaiting_user_info", label: "待补资料" },
  { key: "consult_ready_for_assignment", label: "可转顾问" },
  { key: "consult_assigned", label: "已转顾问" },
  { key: "consult_scheduled", label: "咨询已排期" },
  { key: "consult_completed", label: "咨询已完成" },
  { key: "follow_up", label: "咨询后跟进" },
  { key: "nurturing", label: "培育池" },
  { key: "closed", label: "已关闭" }
];

function resolveV2Status(lead) {
  const embeddedStatus = lead.caseRecord?.status || lead.adminFollowUpRecord?.status;

  if (embeddedStatus) {
    return embeddedStatus;
  }

  if (lead.status === "已关闭") {
    return "closed";
  }

  if (lead.status === "暂不跟进") {
    return "nurturing";
  }

  if (lead.status === "已转化") {
    return "consult_completed";
  }

  if (lead.status === "顾问已接收") {
    return "consult_scheduled";
  }

  if (lead.status === "跟进中") {
    return "admin_following";
  }

  if (lead.status === "已派单") {
    return "consult_assigned";
  }

  return "report_viewed";
}

function filterHref(statusKey) {
  return statusKey === "all" ? "/advisor" : `/advisor?v2Status=${statusKey}`;
}

export default async function AdvisorPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const selectedStatus =
    typeof resolvedSearchParams?.v2Status === "string" && resolvedSearchParams.v2Status.length > 0
      ? resolvedSearchParams.v2Status
      : "all";
  const [{ leads, storageMode }, supabaseStatus, wecomStatus] = await Promise.all([
    listLeads(),
    diagnoseSupabase(),
    diagnoseWeCom()
  ]);
  const leadsWithV2Status = leads.map((lead) => ({
    ...lead,
    v2Status: resolveV2Status(lead)
  }));
  const stats = buildLeadStats(leads);
  const awaitingAssignment = leadsWithV2Status.filter((lead) =>
    ["report_viewed", "consult_intent_submitted", "admin_following", "consult_ready_for_assignment"].includes(lead.v2Status)
  ).length;
  const newlyAssigned = leadsWithV2Status.filter((lead) => lead.v2Status === "consult_assigned").length;
  const inProgress = leadsWithV2Status.filter((lead) =>
    ["consult_scheduled", "consult_completed", "follow_up"].includes(lead.v2Status)
  ).length;
  const v2StatusCounts = leadsWithV2Status.reduce(
    (acc, lead) => {
      acc.all += 1;
      acc[lead.v2Status] = (acc[lead.v2Status] || 0) + 1;
      return acc;
    },
    { all: 0 }
  );
  const filteredLeads =
    selectedStatus === "all" ? leadsWithV2Status : leadsWithV2Status.filter((lead) => lead.v2Status === selectedStatus);
  const selectedStatusLabel = v2StatusOptions.find((item) => item.key === selectedStatus)?.label || "当前筛选";

  return (
    <main className="page-shell home-shell">
      <section className="hero hero--compact">
        <div className="hero-copy">
          <p className="eyebrow">Advisor Workspace</p>
          <h1>顾问工作台</h1>
          <p className="hero-text">
            结构化线索管理、自动评级分配、企业微信集成、跟进记录沉淀。一套平台串联获客、前诊、分诊到顾问转化的完整闭环。
          </p>
          <div className="hero-actions">
            <Link className="secondary-button" href="/">
              返回用户端
            </Link>
            <Link className="secondary-button" href="/admin">
              管理员跟进台
            </Link>
            <form action={apiPath("/api/advisor/logout")} method="post">
              <button className="secondary-button" type="submit">
                退出登录
              </button>
            </form>
          </div>
        </div>

        <div className="hero-panel hero-panel--compact">
          <div className="hero-note">
            <span className="hero-kicker">Queue Snapshot</span>
            <div style={{ marginTop: "14px" }}>
              <strong style={{ fontSize: "2.2rem", display: "block", marginBottom: "4px" }}>{leads.length}</strong>
              <span style={{ fontSize: "0.92rem" }}>当前总线索数</span>
            </div>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <div className="hero-panel-block">
              <strong style={{ fontSize: "1.4rem", display: "block" }}>{awaitingAssignment}</strong>
              <span className="hero-kicker" style={{ marginTop: "6px" }}>待派单</span>
            </div>
            <div className="hero-panel-block">
              <strong style={{ fontSize: "1.4rem", display: "block" }}>{newlyAssigned}</strong>
              <span className="hero-kicker" style={{ marginTop: "6px" }}>已派单</span>
            </div>
            <div className="hero-panel-block">
              <strong style={{ fontSize: "1.4rem", display: "block" }}>{inProgress}</strong>
              <span className="hero-kicker" style={{ marginTop: "6px" }}>处理中</span>
            </div>
          </div>
        </div>
      </section>

      <section className="advisor-split-grid">
        <article className="card advisor-note-card">
          <p className="eyebrow">Core Logic</p>
          <h2>顾问优先级 {`>`} 页面转化</h2>
          <p>系统聚焦处理顺序：谁该优先接、主要风险点在哪、是否需要改派。让顾问专注于高质量首咨和转化。</p>
        </article>

        <article className="card advisor-note-card advisor-note-card--dark">
          <p className="eyebrow">Workflow</p>
          <h2>一套平台串联获客、诊断、分诊、跟进</h2>
          <p>线索进入后统一管理：派单、状态、备注、WeCom通知与顾问协同。完整闭环，避免信息散落。</p>
        </article>
      </section>

      <section className={`card storage-status-card ${supabaseStatus.connected ? "storage-status-card--ok" : "storage-status-card--warn"}`}>
        <div>
          <p className="eyebrow">Supabase 状态</p>
          <h2>{supabaseStatus.connected ? "已经连上 Supabase" : "还没有切到 Supabase"}</h2>
          <p className="inline-note">{supabaseStatus.message}</p>
          {supabaseStatus.missingVars.length > 0 ? (
            <p className="inline-note">待补环境变量：{supabaseStatus.missingVars.join("、")}</p>
          ) : null}
          {!supabaseStatus.connected && supabaseStatus.configured ? (
            <p className="inline-note">如果刚刚建好项目，下一步请在 Supabase SQL Editor 执行 `supabase/schema.sql`，然后重启开发服务。</p>
          ) : null}
        </div>
        <div className="storage-status-meta">
          <span>{storageMode === "supabase" ? "当前请求已走 Supabase" : "当前请求仍走本地 JSON"}</span>
          <span>{supabaseStatus.configured ? "服务端环境变量已填写" : "服务端环境变量未完成"}</span>
        </div>
      </section>

      <section className={`card storage-status-card ${wecomStatus.ready ? "storage-status-card--ok" : "storage-status-card--warn"}`}>
        <div>
          <p className="eyebrow">企业微信状态</p>
          <h2>{wecomStatus.ready ? "企业微信通知已就绪" : "企业微信通知还未就绪"}</h2>
          <p className="inline-note">{wecomStatus.message}</p>
          {!wecomStatus.defaultConfigured ? (
            <p className="inline-note">建议至少填写 `WECOM_WEBHOOK_URL`，这样普通线索和状态更新都能收到通知。</p>
          ) : null}
          {wecomStatus.invalidVars.length > 0 ? (
            <p className="inline-note">需要检查的环境变量：{wecomStatus.invalidVars.join("、")}</p>
          ) : null}
        </div>
        <div className="storage-status-meta">
          <span>{wecomStatus.defaultConfigured ? "默认 webhook 已填写" : "默认 webhook 未填写"}</span>
          <span>{wecomStatus.highPriorityConfigured ? "高优先级 webhook 已填写" : "高优先级 webhook 未填写"}</span>
        </div>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">通知联调</p>
            <h2>从顾问工作台直接发送企业微信测试消息</h2>
          </div>
        </div>
        <p className="inline-note">
          普通测试会走 `WECOM_WEBHOOK_URL`，高优先级测试会优先走 `WECOM_HIGH_PRIORITY_WEBHOOK_URL`，如果没配则回落到默认通道。
        </p>
        <WeComTester />
      </section>

      <section className="three-column stats-grid">
        <article className="card stat-card">
          <span>线索总数</span>
          <strong>{stats.summary.total}</strong>
        </article>
        <article className="card stat-card">
          <span>高优先级</span>
          <strong>{stats.summary.high}</strong>
        </article>
        <article className="card stat-card">
          <span>跟进中</span>
          <strong>{stats.summary.active}</strong>
        </article>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">V2 状态看板</p>
            <h2>按状态筛选当前线索池</h2>
          </div>
          <span className="inline-note">当前筛选：{selectedStatusLabel}</span>
        </div>
        <div className="analytics-list">
          {v2StatusOptions.map((statusOption) => {
            const count = v2StatusCounts[statusOption.key] || 0;
            const isActive = statusOption.key === selectedStatus;

            return (
              <div className="analytics-row" key={statusOption.key}>
                <span>{statusOption.label}</span>
                <span>{count} 条</span>
                <Link className={isActive ? "primary-button" : "secondary-button"} href={filterHref(statusOption.key)}>
                  {isActive ? "查看中" : "筛选"}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Lead Queue</p>
            <h2>顾问待处理线索</h2>
          </div>
          <span className="inline-note">当前结果 {filteredLeads.length} 条，已转化 {stats.summary.converted} 条</span>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="empty-state">
            <p>当前筛选下还没有线索，调整状态筛选或先去用户端提交一份前诊问卷。</p>
            <Link className="primary-button" href="/questionnaire">
              去生成第一条线索
            </Link>
          </div>
        ) : (
          <div className="lead-table">
            <div className="lead-row lead-row--head">
              <span>家长 / 孩子</span>
              <span>路径初判</span>
              <span>评级</span>
              <span>渠道</span>
              <span>顾问</span>
              <span>状态</span>
              <span>操作</span>
            </div>
            {filteredLeads.map((lead) => (
              <div className="lead-row" key={lead.id}>
                <span>
                  {lead.answers.contactName}
                  <small>{lead.answers.studentName}</small>
                </span>
                <span>{lead.result.primaryPathLabel}</span>
                <span>
                  {lead.result.scores.grade}
                  <small>{lead.result.scores.priority}优先级</small>
                </span>
                <span>
                  {lead.channelLabel}
                  <small>{lead.utmCampaign || "未命名活动"}</small>
                </span>
                <span>{lead.assignment.consultantName}</span>
                <span>
                  {v2StatusLabelMap[lead.v2Status] || lead.v2Status}
                  <small>{lead.status}</small>
                </span>
                <Link className="secondary-button" href={`/advisor/leads/${lead.id}`}>
                  查看详情
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="result-grid analytics-grid">
        <article className="card table-card">
          <div className="table-header">
            <div>
              <p className="eyebrow">渠道统计</p>
              <h2>按来源看线索质量</h2>
            </div>
          </div>
          {stats.channels.length === 0 ? (
            <p className="inline-note">线索进入后，这里会自动汇总各渠道的数量与质量。</p>
          ) : (
            <div className="analytics-list">
              {stats.channels.map((channel) => (
                <div className="analytics-row" key={channel.key}>
                  <span>{channel.label}</span>
                  <span>{channel.total} 条</span>
                  <span>{channel.high} 条高优先级</span>
                  <span>{channel.converted} 条已转化</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="card table-card">
          <div className="table-header">
            <div>
              <p className="eyebrow">活动统计</p>
              <h2>Top Campaign</h2>
            </div>
          </div>
          {stats.campaigns.length === 0 ? (
            <p className="inline-note">带上 `utm_campaign` 后，这里会自动聚合活动表现。</p>
          ) : (
            <div className="analytics-list">
              {stats.campaigns.map((campaign) => (
                <div className="analytics-row" key={campaign.name}>
                  <span>{campaign.name}</span>
                  <span>{campaign.leads} 条线索</span>
                  <span>{campaign.high} 条高优先级</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
