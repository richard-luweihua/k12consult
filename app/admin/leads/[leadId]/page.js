import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadWorkbench } from "../../../../components/LeadWorkbench";
import { getLead } from "../../../../lib/data";
import { formatAnswerSummary } from "../../../../lib/intake";
import { apiPath } from "../../../../lib/paths";

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
const intentLevelLabelMap = {
  high: "高意愿",
  medium: "中意愿",
  low: "低意愿"
};
const targetTimelineLabelMap = {
  this_semester: "这学期",
  sep_intake: "今年 9 月",
  next_year: "明年及以后",
  uncertain: "尚不确定"
};
const budgetLevelLabelMap = {
  local_oriented: "本地导向预算",
  medium_private: "中等私立/直资预算",
  international: "国际学校预算",
  unspecified: "暂未明确"
};
const firstContactSlaLabelMap = {
  in_progress: "进行中",
  met: "已达标",
  violated: "已超时"
};
const consultFocusLabelMap = {
  school_matching: "选校匹配",
  pathway_logic: "路径判断",
  english_gap: "英文衔接",
  interview_prep: "面试准备",
  logistics_visa: "手续与证件",
  comprehensive: "综合判断"
};
const missingInfoLabelMap = {
  academic_reports: "成绩单",
  standardized_scores: "标准化成绩",
  identity_proof: "身份证明",
  address_proof: "住址证明"
};

function toDisplayValue(value, fallback = "未填写", map = null) {
  if (!value) {
    return fallback;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return fallback;
    }

    return value.map((item) => (map?.[item] ? map[item] : item)).join("、");
  }

  return map?.[value] ? map[value] : String(value);
}

function withLabel(map, value, fallback = "未评估") {
  if (!value) {
    return fallback;
  }

  return map[value] || value;
}

export default async function AdminLeadDetailPage({ params }) {
  const resolvedParams = await params;
  const { lead, consultants } = await getLead(resolvedParams.leadId);

  if (!lead) {
    notFound();
  }

  const summary = formatAnswerSummary(lead.answers);
  const currentV2Status = lead.caseRecord?.status || lead.adminFollowUpRecord?.status || "report_viewed";
  const record = lead.adminFollowUpRecord || {};
  const userSupplement = record.userSupplement || {};
  const consultationSummary = lead.caseRecord?.consultationSummary || null;
  const postConsultation = lead.caseRecord?.postConsultation || {};
  const closure = lead.caseRecord?.closure || {};

  return (
    <main className="page-shell">
      <div className="page-topbar">
        <Link className="topbar-link" href="/admin">← 返回管理员列表</Link>
        <div className="page-topbar-actions">
          <Link className="topbar-link" href={`/result/${lead.id}`}>查看用户结果页</Link>
          <form action={apiPath("/api/admin/logout")} method="post" className="logout-form">
            <button className="secondary-button" type="submit">
              退出登录
            </button>
          </form>
        </div>
      </div>

      <section className="advisor-detail-hero card">
        <div>
          <p className="eyebrow">Admin Follow-Up Case</p>
          <h1>
            {lead.answers.contactName} / {lead.answers.studentName}
          </h1>
          <p className="hero-text">{lead.result.overview}</p>
          <div className="result-meta-row advisor-result-meta-row">
            <span>{lead.channelLabel}</span>
            <span>{lead.utmCampaign || "未命名活动"}</span>
            <span>{lead.assignment.consultantName}</span>
          </div>
        </div>
        <div className="result-grade">
          <span>当前 V2.0 状态</span>
          <strong>{v2StatusLabelMap[currentV2Status] || currentV2Status}</strong>
          <small>{lead.status}</small>
        </div>
      </section>

      <section className="advisor-summary-grid">
        <article className="card advisor-summary-card">
          <span>咨询意愿</span>
          <strong>{withLabel(intentLevelLabelMap, record.intentLevel)}</strong>
          <small>可在下方工作台更新</small>
        </article>
        <article className="card advisor-summary-card">
          <span>推进时间</span>
          <strong>{withLabel(targetTimelineLabelMap, record.targetTimeline)}</strong>
          <small>用于排期与分配</small>
        </article>
        <article className="card advisor-summary-card">
          <span>预算接受度</span>
          <strong>{withLabel(budgetLevelLabelMap, record.budgetLevel)}</strong>
          <small>用于确认咨询深度</small>
        </article>
      </section>

      <LeadWorkbench consultants={consultants} lead={lead} workspace="admin" />

      <section className="result-grid">
        <article className="card">
          <p className="eyebrow">管理员交接摘要</p>
          <p>{record.handoffSummary || "暂未填写交接摘要。"}</p>
          <p className="inline-note">咨询重点：{toDisplayValue(record.consultFocus, "未标记", consultFocusLabelMap)}</p>
          <p className="inline-note">缺失资料：{toDisplayValue(record.missingInfo, "未标记", missingInfoLabelMap)}</p>
          <p className="inline-note">用户已补：{toDisplayValue(userSupplement.providedItems, "暂无", missingInfoLabelMap)}</p>
          <p className="inline-note">用户说明：{userSupplement.notes || "暂无"}</p>
          <p className="inline-note">
            最近回填：{userSupplement.submittedAt ? new Date(userSupplement.submittedAt).toLocaleString("zh-CN") : "暂无"}
          </p>
        </article>

        <article className="card">
          <p className="eyebrow">内部备注</p>
          <p>{record.adminInternalNotes || "暂无内部备注。"}</p>
          <div className="detail-list">
            <div className="detail-item">
              <span>SLA 状态</span>
              <strong>{withLabel(firstContactSlaLabelMap, record.slaStatus, "未标记")}</strong>
            </div>
            <div className="detail-item">
              <span>首次联系时间</span>
              <strong>{record.firstContactAt ? new Date(record.firstContactAt).toLocaleString("zh-CN") : "未记录"}</strong>
            </div>
            <div className="detail-item">
              <span>确认合格时间</span>
              <strong>{record.qualifiedAt ? new Date(record.qualifiedAt).toLocaleString("zh-CN") : "未记录"}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="card">
        <p className="eyebrow">问卷摘要</p>
        <div className="detail-list">
          {summary.map((item) => (
            <div className="detail-item" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">跟进记录</p>
        <div className="log-list">
          {lead.followUps.map((recordItem) => (
            <div className="log-item" key={recordItem.id}>
              <strong>{recordItem.author}</strong>
              <span>{new Date(recordItem.createdAt).toLocaleString("zh-CN")}</span>
              <p>{recordItem.note}</p>
            </div>
          ))}
        </div>
      </section>

      {consultationSummary ? (
        <section className="card">
          <p className="eyebrow">顾问咨询结论</p>
          <div className="detail-list">
            <div className="detail-item">
              <span>最终路径建议</span>
              <strong>{consultationSummary.finalPath || "待补充"}</strong>
            </div>
            <div className="detail-item">
              <span>目标学校层级</span>
              <strong>{consultationSummary.schoolBand || "待补充"}</strong>
            </div>
            <div className="detail-item">
              <span>风险控制动作</span>
              <strong>{consultationSummary.riskActions || "待补充"}</strong>
            </div>
            <div className="detail-item">
              <span>3个月第一步动作</span>
              <strong>{consultationSummary.nextAction || "待补充"}</strong>
            </div>
          </div>
          <p className="inline-note">顾问备注：{consultationSummary.consultantNote || "暂无"}</p>
        </section>
      ) : null}

      <section className="card">
        <p className="eyebrow">会后跟进与收口</p>
        <div className="detail-list">
          <div className="detail-item">
            <span>会后跟进摘要</span>
            <strong>{postConsultation.summary || "待补充"}</strong>
          </div>
          <div className="detail-item">
            <span>下一步动作</span>
            <strong>{postConsultation.nextStep || "待补充"}</strong>
          </div>
          <div className="detail-item">
            <span>责任人</span>
            <strong>{postConsultation.owner || "待指定"}</strong>
          </div>
          <div className="detail-item">
            <span>关闭原因</span>
            <strong>{closure.reason || "未关闭"}</strong>
          </div>
          <div className="detail-item">
            <span>关闭时间</span>
            <strong>{closure.closedAt ? new Date(closure.closedAt).toLocaleString("zh-CN") : "未关闭"}</strong>
          </div>
          <div className="detail-item">
            <span>关闭备注</span>
            <strong>{closure.note || "暂无"}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
