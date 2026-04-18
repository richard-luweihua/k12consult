import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { LeadWorkbench } from "../../../../components/LeadWorkbench";
import { getLead } from "../../../../lib/data";
import { formatAnswerSummary } from "../../../../lib/intake";
import { canActorViewLead, resolveActorFromCookieStore, sanitizeLeadForActor } from "../../../../lib/lead-access";
import { apiPath } from "../../../../lib/paths";

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

function withLabel(map, value, fallback = "未评估") {
  if (!value) {
    return fallback;
  }

  return map[value] || value;
}

function withArrayLabel(map, values, fallback = "未标记") {
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }

  return values.map((item) => map[item] || item).join("、");
}

export default async function AdvisorLeadDetailPage({ params }) {
  const cookieStore = await cookies();
  const actor = await resolveActorFromCookieStore(cookieStore);
  const resolvedParams = await params;
  const { lead, consultants } = await getLead(resolvedParams.leadId);

  if (!lead) {
    notFound();
  }

  if (!canActorViewLead(actor, lead)) {
    notFound();
  }

  const safeLead = sanitizeLeadForActor(actor, lead);
  const summary = formatAnswerSummary(safeLead.answers);
  const currentV2Status = safeLead.caseRecord?.status || safeLead.adminFollowUpRecord?.status || "report_viewed";
  const adminRecord = safeLead.adminFollowUpRecord || {};
  const postConsultation = safeLead.caseRecord?.postConsultation || {};
  const closure = safeLead.caseRecord?.closure || {};

  return (
    <main className="page-shell">
      <div className="page-topbar">
        <Link className="topbar-link" href="/advisor/workbench">← 返回线索库</Link>
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
          <strong>{v2StatusLabelMap[currentV2Status] || currentV2Status}</strong>
          <small>{lead.status} / {lead.assignment.consultantName}</small>
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

      <section className="result-grid">
        <article className="card">
          <p className="eyebrow">管理员交接包</p>
          <p>{adminRecord.handoffSummary || "管理员暂未填写交接摘要。"}</p>
          <div className="detail-list">
            <div className="detail-item">
              <span>咨询意愿</span>
              <strong>{withLabel(intentLevelLabelMap, adminRecord.intentLevel, "未评估")}</strong>
            </div>
            <div className="detail-item">
              <span>推进时间</span>
              <strong>{withLabel(targetTimelineLabelMap, adminRecord.targetTimeline, "未评估")}</strong>
            </div>
            <div className="detail-item">
              <span>预算接受度</span>
              <strong>{withLabel(budgetLevelLabelMap, adminRecord.budgetLevel, "未评估")}</strong>
            </div>
            <div className="detail-item">
              <span>咨询重点</span>
              <strong>{withArrayLabel(consultFocusLabelMap, adminRecord.consultFocus)}</strong>
            </div>
            <div className="detail-item">
              <span>缺失资料</span>
              <strong>{withArrayLabel(missingInfoLabelMap, adminRecord.missingInfo)}</strong>
            </div>
          </div>
        </article>

        <article className="card">
          <p className="eyebrow">咨询准备提示</p>
          <p>建议顾问先围绕管理员确认过的重点做首轮咨询，优先解决交接摘要中的 1-2 个关键问题。</p>
          <ul className="plain-list">
            <li>先核对家长本次最关心的问题，避免会中重复背景采集。</li>
            <li>对“缺失资料”项给出补齐路径和截止时间。</li>
            <li>会后把关键结论沉淀到跟进记录，保持管理端与顾问端一致。</li>
          </ul>
        </article>
      </section>

      <LeadWorkbench consultants={consultants} lead={safeLead} workspace="advisor" />

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
          <p className="eyebrow">会后跟进</p>
          <div className="detail-list">
            <div className="detail-item">
              <span>跟进摘要</span>
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
          </div>
        </article>

        <article className="card">
          <p className="eyebrow">案例收口</p>
          <div className="detail-list">
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
