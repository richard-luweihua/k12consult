'use client';

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiPath } from "@/lib/paths";
import { usePermissions } from "@/lib/permissions";

function scoreLabel(score) {
  return `${score} / 5`;
}

const contactTimeOptions = [
  ["workday", "工作日白天"],
  ["evening", "工作日晚间"],
  ["weekend", "周末"],
  ["flexible", "均可"]
];
const consultationStatusLabelMap = {
  draft: "已填写意向偏好，待确认提交",
  submitted: "已提交咨询意向",
  not_requested: "尚未提交咨询意向",
  cancelled: "已取消"
};
const v2StatusLabelMap = {
  report_viewed: "报告已查看",
  consult_intent_submitted: "咨询意向已提交",
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
const missingInfoLabelMap = {
  academic_reports: "成绩单",
  standardized_scores: "标准化成绩",
  identity_proof: "身份证明",
  address_proof: "住址证明"
};
const defaultMissingInfoOptions = Object.keys(missingInfoLabelMap);

function resolveCurrentV2Status(lead) {
  return lead?.caseRecord?.status || lead?.adminFollowUpRecord?.status || "report_viewed";
}

function canEditConsultationIntent(v2Status) {
  return !["closed", "nurturing", "consult_scheduled", "consult_completed", "follow_up"].includes(v2Status);
}

function toggleArrayValue(values, value) {
  if (!Array.isArray(values)) {
    return [value];
  }

  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export default function ResultPage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { canViewOwnLeads, canViewAssignedLeads, canViewAllLeads } = usePermissions();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [contactTimePreference, setContactTimePreference] = useState("flexible");
  const [consultationNotes, setConsultationNotes] = useState("");
  const [submittingIntent, setSubmittingIntent] = useState(false);
  const [intentMessage, setIntentMessage] = useState("");
  const [intentError, setIntentError] = useState("");
  const [supplementalProvidedItems, setSupplementalProvidedItems] = useState([]);
  const [supplementalNotes, setSupplementalNotes] = useState("");
  const [submittingSupplemental, setSubmittingSupplemental] = useState(false);
  const [supplementalMessage, setSupplementalMessage] = useState("");
  const [supplementalError, setSupplementalError] = useState("");

  useEffect(() => {
    async function fetchLead() {
      if (!params?.submissionId) return;

      try {
        const response = await fetch(apiPath(`/api/results/${params.submissionId}`), {
          cache: "no-store"
        });

        if (response.status === 404) {
          setLead(null);
          return;
        }

        if (!response.ok) {
          throw new Error("获取结果失败");
        }

        const { lead: leadData } = await response.json();
        setLead(leadData);
      } catch (error) {
        console.error('Error fetching lead:', error);
        setFetchError(error instanceof Error ? error.message : "获取结果失败");
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchLead();
    }
  }, [params?.submissionId, authLoading]);

  useEffect(() => {
    if (!lead) {
      return;
    }

    setContactTimePreference(lead.consultationRequest?.contactTimePreference || lead.answers?.contactWindow || "flexible");
    setConsultationNotes(lead.consultationRequest?.notes || "");
    setSupplementalProvidedItems(
      Array.isArray(lead.adminFollowUpRecord?.userSupplement?.providedItems)
        ? lead.adminFollowUpRecord.userSupplement.providedItems
        : []
    );
    setSupplementalNotes(lead.adminFollowUpRecord?.userSupplement?.notes || "");
  }, [lead]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">请先登录</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">{fetchError || "未找到对应结果"}</div>
      </div>
    );
  }

  // 权限检查
  const consultantKey = user.consultant_id || user.consultantId || user.id;
  const canView = (
    (canViewOwnLeads && lead.userId === user.id) ||
    canViewAllLeads ||
    (canViewAssignedLeads && lead.assignedConsultantId === consultantKey)
  );

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">无权限查看此结果</div>
      </div>
    );
  }

  const { result, answers, assignment } = lead;
  const reportSummary = lead.currentReport?.summary || result.currentReport?.summary || null;
  const isOwner = lead.userId === user.id || lead.user_id === user.id || lead.answers?.userId === user.id;
  const currentV2Status = resolveCurrentV2Status(lead);
  const consultationRequest = lead.consultationRequest || {};
  const adminRecord = lead.adminFollowUpRecord || {};
  const consultationSummary = lead.caseRecord?.consultationSummary || null;
  const postConsultation = lead.caseRecord?.postConsultation || {};
  const closure = lead.caseRecord?.closure || {};
  const consultationStatus = consultationRequest.requestStatus || "not_requested";
  const canSubmitIntent = isOwner && canEditConsultationIntent(currentV2Status);
  const canSubmitSupplemental = isOwner && currentV2Status === "awaiting_user_info";
  const missingInfoOptions = Array.isArray(adminRecord.missingInfo) && adminRecord.missingInfo.length > 0
    ? adminRecord.missingInfo
    : defaultMissingInfoOptions;
  const intentButtonLabel = consultationStatus === "submitted" ? "更新咨询意向" : "确认并提交咨询意向";

  async function submitConsultationIntent() {
    if (!params?.submissionId || !canSubmitIntent) {
      return;
    }

    setSubmittingIntent(true);
    setIntentMessage("");
    setIntentError("");

    try {
      const response = await fetch(apiPath(`/api/results/${params.submissionId}/consultation-intent`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          contactTimePreference,
          notes: consultationNotes
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.message || "提交咨询意向失败");
      }

      setLead(payload.lead);
      setIntentMessage("咨询意向已提交，我们会尽快由管理员跟进。");
    } catch (error) {
      setIntentError(error instanceof Error ? error.message : "提交咨询意向失败");
    } finally {
      setSubmittingIntent(false);
    }
  }

  async function submitSupplementalInfo() {
    if (!params?.submissionId || !canSubmitSupplemental) {
      return;
    }

    setSubmittingSupplemental(true);
    setSupplementalMessage("");
    setSupplementalError("");

    try {
      const response = await fetch(apiPath(`/api/results/${params.submissionId}/supplemental-info`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          providedItems: supplementalProvidedItems,
          notes: supplementalNotes
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.message || "提交补资料失败");
      }

      setLead(payload.lead);
      setSupplementalMessage("补资料已提交，管理员会继续跟进。");
    } catch (error) {
      setSupplementalError(error instanceof Error ? error.message : "提交补资料失败");
    } finally {
      setSubmittingSupplemental(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="page-topbar">
        <Link href="/dashboard">返回仪表板</Link>
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

      {reportSummary ? (
        <section className="result-grid">
          <article className="card insight-card">
            <p className="eyebrow">V2 诊断摘要</p>
            <ul className="plain-list">
              <li>身份判断：{reportSummary.identityVerdict}</li>
              <li>时间窗口：{reportSummary.intakeWindowVerdict}</li>
              <li>英语衔接：{reportSummary.englishRiskLevel}</li>
            </ul>
          </article>

          <article className="card insight-card">
            <p className="eyebrow">重点预警</p>
            <ul className="plain-list">
              {(reportSummary.criticalWarnings?.length
                ? reportSummary.criticalWarnings
                : [{ title: "当前可继续推进", content: "目前没有触发硬性阻断项，可继续进入顾问细化判断。" }]
              ).map((warning) => (
                <li key={warning.title}>
                  <strong>{warning.title}</strong>：{warning.content}
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}

      {consultationSummary ? (
        <section className="result-grid">
          <article className="card insight-card">
            <p className="eyebrow">顾问咨询结论</p>
            <ul className="plain-list">
              <li>最终路径：{consultationSummary.finalPath || "待补充"}</li>
              <li>学校层级：{consultationSummary.schoolBand || "待补充"}</li>
              <li>风险控制：{consultationSummary.riskActions || "待补充"}</li>
              <li>3个月第一步：{consultationSummary.nextAction || "待补充"}</li>
            </ul>
            <p className="inline-note">
              更新时间：{consultationSummary.updatedAt ? new Date(consultationSummary.updatedAt).toLocaleString("zh-CN") : "未知"}
            </p>
          </article>

          <article className="card insight-card">
            <p className="eyebrow">顾问补充说明</p>
            <p>{consultationSummary.consultantNote || "顾问暂未补充更多说明。"}</p>
            <p className="inline-note">
              咨询时间：{lead.caseRecord?.consultationScheduledAt ? new Date(lead.caseRecord.consultationScheduledAt).toLocaleString("zh-CN") : "待确认"}
            </p>
            <p className="inline-note">
              咨询完成：{lead.caseRecord?.consultationCompletedAt ? new Date(lead.caseRecord.consultationCompletedAt).toLocaleString("zh-CN") : "未完成"}
            </p>
          </article>
        </section>
      ) : null}

      {(postConsultation.summary || closure.reason) ? (
        <section className="result-grid">
          <article className="card insight-card">
            <p className="eyebrow">会后安排</p>
            <ul className="plain-list">
              <li>跟进摘要：{postConsultation.summary || "待补充"}</li>
              <li>下一步动作：{postConsultation.nextStep || "待补充"}</li>
              <li>责任人：{postConsultation.owner || "待确认"}</li>
            </ul>
          </article>

          <article className="card insight-card">
            <p className="eyebrow">案例状态</p>
            <ul className="plain-list">
              <li>当前状态：{v2StatusLabelMap[currentV2Status] || currentV2Status}</li>
              <li>关闭原因：{closure.reason || "未关闭"}</li>
              <li>关闭时间：{closure.closedAt ? new Date(closure.closedAt).toLocaleString("zh-CN") : "未关闭"}</li>
            </ul>
            {closure.note ? <p className="inline-note">补充说明：{closure.note}</p> : null}
          </article>
        </section>
      ) : null}

      <section className="card cta-panel">
        <div>
          <p className="eyebrow">Supplemental Info</p>
          <h2>如果管理员提示待补资料，可在这里直接回填。</h2>
          <p className="inline-note">
            当前状态：{v2StatusLabelMap[currentV2Status] || currentV2Status}
            {Array.isArray(adminRecord.missingInfo) && adminRecord.missingInfo.length > 0
              ? ` · 待补：${adminRecord.missingInfo.map((item) => missingInfoLabelMap[item] || item).join("、")}`
              : ""}
          </p>
          {adminRecord.userSupplement?.submittedAt ? (
            <p className="inline-note">最近回填：{new Date(adminRecord.userSupplement.submittedAt).toLocaleString("zh-CN")}</p>
          ) : null}
        </div>

        {canSubmitSupplemental ? (
          <div className="control-stack" style={{ marginTop: "16px" }}>
            <label className="field-block">
              <span className="field-label">本次已补齐资料</span>
              <div className="option-grid">
                {missingInfoOptions.map((item) => (
                  <button
                    className={supplementalProvidedItems.includes(item) ? "option-chip active" : "option-chip"}
                    key={item}
                    type="button"
                    onClick={() => setSupplementalProvidedItems((current) => toggleArrayValue(current, item))}
                  >
                    {missingInfoLabelMap[item] || item}
                  </button>
                ))}
              </div>
            </label>

            <label className="field-block">
              <span className="field-label">补充说明（选填）</span>
              <textarea
                className="text-area"
                rows={4}
                placeholder="例如：成绩单和身份证明已上传，请协助确认下一步安排。"
                value={supplementalNotes}
                onChange={(event) => setSupplementalNotes(event.target.value)}
              />
            </label>

            <button className="primary-button" type="button" disabled={submittingSupplemental} onClick={submitSupplementalInfo}>
              {submittingSupplemental ? "提交中..." : "提交补资料"}
            </button>
            {supplementalMessage ? <p className="inline-note">{supplementalMessage}</p> : null}
            {supplementalError ? <p className="inline-note" style={{ color: "#b42318" }}>{supplementalError}</p> : null}
          </div>
        ) : (
          <p className="inline-note" style={{ marginTop: "16px" }}>
            目前无需补资料，若管理员有新要求会在状态变更后显示此入口。
          </p>
        )}
      </section>

      <section className="card cta-panel cta-panel--executive">
        <div>
          <p className="eyebrow">Consultation Request</p>
          <h2>如果你准备继续推进，可以直接提交咨询意向。</h2>
          <p>系统当前状态：{v2StatusLabelMap[currentV2Status] || currentV2Status}。建议顾问：{assignment.consultantName}。</p>
          <p className="inline-note">咨询意向状态：{consultationStatusLabelMap[consultationStatus] || consultationStatus}</p>
          {consultationRequest.submittedAt ? (
            <p className="inline-note">最近提交：{new Date(consultationRequest.submittedAt).toLocaleString("zh-CN")}</p>
          ) : null}
        </div>

        {canSubmitIntent ? (
          <div className="control-stack" style={{ marginTop: "16px" }}>
            <label className="field-block">
              <span className="field-label">方便联系时间</span>
              <select
                className="select-input"
                value={contactTimePreference}
                onChange={(event) => setContactTimePreference(event.target.value)}
              >
                {contactTimeOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-block">
              <span className="field-label">本次希望重点咨询的问题</span>
              <textarea
                className="text-area"
                rows={4}
                placeholder="例如：想先确认 9 月插班可行性，以及英文衔接方案。"
                value={consultationNotes}
                onChange={(event) => setConsultationNotes(event.target.value)}
              />
            </label>

            <button className="primary-button" type="button" disabled={submittingIntent} onClick={submitConsultationIntent}>
              {submittingIntent ? "提交中..." : intentButtonLabel}
            </button>
            {intentMessage ? <p className="inline-note">{intentMessage}</p> : null}
            {intentError ? <p className="inline-note" style={{ color: "#b42318" }}>{intentError}</p> : null}
          </div>
        ) : (
          <p className="inline-note" style={{ marginTop: "16px" }}>
            当前状态下不支持在线提交咨询意向，如需调整请联系管理员。
          </p>
        )}

        <div className="hero-actions">
          <Link className="secondary-button" href="/questionnaire">
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
