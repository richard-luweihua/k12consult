'use client';

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiPath, appPath } from "@/lib/paths";
import { usePermissions } from "@/lib/permissions";

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
const gradeLabelMap = {
  kindergarten: "幼儿园",
  "g1-g3": "小学 1-3 年级",
  "g4-g6": "小学 4-6 年级",
  "g7-g9": "初中 7-9 年级",
  "g10-g12": "高中 10-12 年级"
};

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

function formatDateTime(value) {
  if (!value) {
    return "未知";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未知" : date.toLocaleString("zh-CN");
}

function formatDate(value) {
  if (!value) {
    return "待更新";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "待更新" : date.toLocaleDateString("zh-CN");
}

function toDisplayValue(value, fallback = "未填写") {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback;
}

function normalizeSchoolName(school) {
  return school.schoolName || school.school_name || "待匹配学校";
}

function normalizeSchoolScore(school) {
  const score = school.matchScore ?? school.match_score ?? null;

  if (typeof score === "number") {
    return score;
  }

  if (typeof score === "string" && score.trim()) {
    return score.trim();
  }

  return "待评估";
}

export default function ResultPage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { canViewOwnLeads, canViewAssignedLeads, canViewAllLeads } = usePermissions();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [contactTimePreference, setContactTimePreference] = useState("flexible");
  const [intentMobile, setIntentMobile] = useState("");
  const [intentWechatId, setIntentWechatId] = useState("");
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
    setIntentMobile(lead.consultationRequest?.mobile || lead.answers?.mobile || user?.mobile || "");
    setIntentWechatId(lead.consultationRequest?.wechatId || lead.answers?.wechat_id || "");
    setConsultationNotes(lead.consultationRequest?.notes || "");
    setSupplementalProvidedItems(
      Array.isArray(lead.adminFollowUpRecord?.userSupplement?.providedItems)
        ? lead.adminFollowUpRecord.userSupplement.providedItems
        : []
    );
    setSupplementalNotes(lead.adminFollowUpRecord?.userSupplement?.notes || "");
  }, [lead, user]);

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

  const consultantKey = user.consultant_id || user.consultantId || user.id;
  const isOwner = lead.userId === user.id || lead.user_id === user.id || lead.answers?.userId === user.id;
  const canView = (
    (canViewOwnLeads && isOwner) ||
    canViewAllLeads ||
    (canViewAssignedLeads &&
      (lead.assignedConsultantId === consultantKey || lead.assigned_consultant_id === consultantKey))
  );

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">无权限查看此结果</div>
      </div>
    );
  }

  const result = lead.result || {};
  const answers = lead.answers || {};
  const assignment = lead.assignment || {};
  const reportSummary = lead.currentReport?.summary || result.currentReport?.summary || {};
  const ruleResult = lead.diagnosticResult?.ruleResultJson || {};
  const schoolSnapshot = lead.diagnosticResult?.schoolDataSnapshotJson || {};
  const currentV2Status = resolveCurrentV2Status(lead);
  const consultationRequest = lead.consultationRequest || {};
  const adminRecord = lead.adminFollowUpRecord || {};
  const consultationStatus = consultationRequest.requestStatus || "not_requested";
  const canSubmitIntent = isOwner && canEditConsultationIntent(currentV2Status);
  const canSubmitSupplemental = isOwner && currentV2Status === "awaiting_user_info";
  const missingInfoOptions =
    Array.isArray(adminRecord.missingInfo) && adminRecord.missingInfo.length > 0
      ? adminRecord.missingInfo
      : defaultMissingInfoOptions;
  const intentButtonLabel = consultationStatus === "submitted" ? "更新咨询意向" : "确认并提交咨询意向";

  const studentName = toDisplayValue(answers.studentName || lead.questionnaireResponse?.responseJson?.studentName);
  const currentGradeRaw = answers.grade || lead.questionnaireResponse?.responseJson?.currentGrade;
  const currentGrade = gradeLabelMap[currentGradeRaw] || toDisplayValue(currentGradeRaw);
  const identityVerdict = toDisplayValue(
    reportSummary.identityVerdict || result.identityVerdict || ruleResult.identityAssessment?.verdict,
    "待评估"
  );
  const budgetMatchSummary = toDisplayValue(reportSummary.budgetMatchSummary || result.budgetMatchSummary, "待评估");
  const coreConclusion = toDisplayValue(
    result.overview,
    "系统已完成首轮诊断，建议按下方行动清单推进下一步。"
  );
  const identityWarning = toDisplayValue(
    ruleResult.identityAssessment?.warning,
    "当前身份条件不构成直接阻断，可继续推进下一步判断。"
  );
  const overallRiskSummary = Array.isArray(result.riskTags) && result.riskTags.length > 0
    ? `当前主要风险：${result.riskTags.join("、")}。`
    : "当前主要风险可控，可继续推进细化判断。";
  const intakeWindowVerdict = toDisplayValue(
    reportSummary.intakeWindowVerdict || result.timingVerdict || ruleResult.timingAssessment?.verdict,
    "待评估"
  );
  const intakeTimingAnalysis = toDisplayValue(
    ruleResult.timingAssessment?.analysis,
    "系统已完成时机初判，建议尽快明确目标学校带并进入执行准备。"
  );
  const englishRiskLevel = toDisplayValue(
    reportSummary.englishRiskLevel || result.englishRiskLevel || ruleResult.englishAssessment?.level,
    "待评估"
  );
  const userEnglishLevelDesc = toDisplayValue(ruleResult.englishAssessment?.userLevelDescription, "待补充");
  const targetPoolBarrier = toDisplayValue(ruleResult.englishAssessment?.targetBarrierLabel, "待匹配");
  const englishBridgeAdvice = toDisplayValue(
    ruleResult.englishAssessment?.bridgeAdvice,
    "建议结合目标学校要求进行针对性衔接准备。"
  );
  const recommendedSchools =
    Array.isArray(reportSummary.recommendedSchools) && reportSummary.recommendedSchools.length > 0
      ? reportSummary.recommendedSchools
      : Array.isArray(schoolSnapshot.recommendedSchools)
        ? schoolSnapshot.recommendedSchools
        : [];
  const criticalWarningsRaw =
    Array.isArray(reportSummary.criticalWarnings) && reportSummary.criticalWarnings.length > 0
      ? reportSummary.criticalWarnings
      : [];
  const criticalWarnings = criticalWarningsRaw.length > 0
    ? criticalWarningsRaw
    : [{ title: "当前可继续推进", content: "目前没有触发硬性阻断项，可继续进入顾问细化判断。" }];
  const immediateActions = [
    result.nextActions?.[0] || "先确认目标切入时间与优先路径。",
    result.nextActions?.[1] || "围绕预算与学校带，收敛到可执行方案。"
  ];
  const preparationActions = [
    result.nextActions?.[2] || "补齐关键材料，建立学校申请清单。",
    result.nextActions?.[3] || "安排一次深度咨询，确认最终执行顺序。"
  ];
  const complexityLabels =
    Array.isArray(result.riskTags) && result.riskTags.length > 0
      ? result.riskTags.join("、")
      : "时间窗口与路径判断";
  const rulesVersion = toDisplayValue(lead.diagnosticJob?.versionSnapshot?.rulesVersion, "V1.0");
  const engineVersion = toDisplayValue(lead.diagnosticJob?.versionSnapshot?.engineVersion, "K12-Expert-Engine");
  const dataSnapshotDate = formatDate(
    schoolSnapshot.snapshotDate ||
      schoolSnapshot.dataSnapshotDate ||
      lead.diagnosticResult?.createdAt ||
      lead.currentReport?.createdAt
  );
  const reportUpdatedAt = formatDateTime(lead.currentReport?.createdAt || lead.updatedAt || lead.updated_at);
  async function submitConsultationIntent() {
    if (!params?.submissionId || !canSubmitIntent) {
      return;
    }

    setSubmittingIntent(true);
    setIntentMessage("");
    setIntentError("");

    try {
      const normalizedMobile = intentMobile.trim();
      const normalizedWechatId = intentWechatId.trim();

      if (!normalizedMobile && !normalizedWechatId) {
        setIntentError("请至少填写手机号或微信号，方便我们联系你。");
        setSubmittingIntent(false);
        return;
      }

      const response = await fetch(apiPath(`/api/results/${params.submissionId}/consultation-intent`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          mobile: normalizedMobile,
          wechatId: normalizedWechatId,
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

  function handleConsultEntry() {
    if (!canSubmitIntent) {
      return;
    }

    if (intentMobile.trim() || intentWechatId.trim()) {
      submitConsultationIntent();
      return;
    }

    document.getElementById("consultation-request")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setIntentError("请先填写联系方式后再提交咨询意向。");
  }

  return (
    <main className="report-v2-page">
      <header className="report-v2-topbar">
        <Link className="report-v2-toplink" href={appPath("/dashboard")}>
          返回仪表板
        </Link>
        <div className="report-v2-topbar-actions">
          <Link className="report-v2-toplink" href={appPath("/questionnaire")}>
            重新填写
          </Link>
          <Link className="report-v2-toplink" href={appPath("/")}>
            返回首页
          </Link>
        </div>
      </header>

      <article className="report-v2-body">
        <header className="report-v2-head">
          <p className="report-v2-kicker">香港转学 AI 诊断报告</p>
          <h1>报告已生成</h1>
          <p>更新时间：{reportUpdatedAt}</p>
        </header>

        <section className="report-v2-section">
          <h2>0. 基本信息</h2>
          <ul className="report-v2-list">
            <li><strong>学生主体：</strong>{studentName}</li>
            <li><strong>当前年级：</strong>{currentGrade}</li>
            <li><strong>身份状态：</strong>{identityVerdict}</li>
            <li><strong>预算匹配：</strong>{budgetMatchSummary}</li>
          </ul>
        </section>

        <section className="report-v2-section">
          <h2>1. 核心结论 (The Verdict)</h2>
          <p>{coreConclusion}</p>
          <blockquote className="report-v2-quote">
            <p><strong>AI 专家判定：</strong></p>
            <p>{identityWarning}</p>
            <p>{overallRiskSummary}</p>
          </blockquote>
        </section>

        <section className="report-v2-section">
          <h2>2. 核心诊断维度</h2>
          <h3>2.1 申请时机与窗口 (Intake Timing)</h3>
          <ul className="report-v2-list">
            <li><strong>判定状态：</strong>{intakeWindowVerdict}</li>
            <li><strong>详细评估：</strong>{intakeTimingAnalysis}</li>
          </ul>
          <h3>2.2 语言衔接风险 (English Gap)</h3>
          <ul className="report-v2-list">
            <li><strong>预警等级：</strong>{englishRiskLevel}</li>
            <li><strong>用户当前：</strong>{userEnglishLevelDesc}</li>
            <li><strong>目标池门槛：</strong>{targetPoolBarrier}</li>
            <li><strong>专家建议：</strong>{englishBridgeAdvice}</li>
          </ul>
        </section>

        <section className="report-v2-section">
          <h2>3. 目标学校穿透建议 (Target School Drilldown)</h2>
          {recommendedSchools.length > 0 ? (
            <div className="report-v2-school-list">
              {recommendedSchools.map((school, index) => (
                <div className="report-v2-school-item" key={`${normalizeSchoolName(school)}-${index + 1}`}>
                  <h3>{normalizeSchoolName(school)}</h3>
                  <ul className="report-v2-list">
                    <li><strong>适配度评估：</strong>{normalizeSchoolScore(school)} / 10</li>
                    <li><strong>关键卡点：</strong>{toDisplayValue(school.criticalBottleneck || school.critical_bottleneck, "待补充")}</li>
                    <li><strong>顾问私货：</strong>{toDisplayValue(school.consultantInsiderTips || school.consultant_insider_tips, "待补充")}</li>
                    <li><strong>学费提示：</strong>{toDisplayValue(school.tuitionFitNote || school.tuition_fit_note, "待补充")}</li>
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p>当前暂无可展示学校建议，建议先提交咨询意向由顾问补全。</p>
          )}
        </section>

        <section className="report-v2-section">
          <h2>4. 深度风险预警 (Critical Alerts)</h2>
          <ul className="report-v2-list">
            {criticalWarnings.map((warning, index) => (
              <li key={`${warning.title || "warning"}-${index}`}>
                <strong>{toDisplayValue(warning.title || warning.warning_title, "风险提示")}：</strong>
                {toDisplayValue(warning.content || warning.warning_content, "待补充")}
              </li>
            ))}
          </ul>
        </section>

        <section className="report-v2-section">
          <h2>5. 后续行动清单 (Next Steps)</h2>
          <h3>第一阶段：立即执行 (下一步 24 小时)</h3>
          <ol className="report-v2-ordered">
            {immediateActions.map((action, index) => (
              <li key={`immediate-${index + 1}`}>{action}</li>
            ))}
          </ol>
          <h3>第二阶段：资料储备 (1-2 周)</h3>
          <ol className="report-v2-ordered">
            {preparationActions.map((action, index) => (
              <li key={`prep-${index + 1}`}>{action}</li>
            ))}
          </ol>
        </section>

        <section className="report-v2-section">
          <h2>6. 专家人工介入引导 (Convert to Consultation)</h2>
          <blockquote className="report-v2-quote">
            <p>
              <strong>
                由于你的案例涉及 {complexityLabels}，建议立即预约资深顾问进行深度线下评估。
              </strong>
            </p>
          </blockquote>
          <div className="report-v2-consult-line">
            <button
              className="report-v2-consult-btn"
              disabled={submittingIntent || !canSubmitIntent}
              onClick={handleConsultEntry}
              type="button"
            >
              {submittingIntent ? "提交中..." : "立即预约资深顾问"}
            </button>
          </div>
          {intentError ? <p className="report-v2-error">{intentError}</p> : null}
          {intentMessage ? <p className="report-v2-success">{intentMessage}</p> : null}
        </section>

        <section className="report-v2-section report-v2-section--last">
          <h2>7. 诊断依据声明</h2>
          <ul className="report-v2-list">
            <li><strong>规则版本：</strong>{rulesVersion}</li>
            <li><strong>模型引擎：</strong>{engineVersion}</li>
            <li><strong>学校库快照：</strong>{dataSnapshotDate}</li>
          </ul>
        </section>
      </article>

      <section className="report-v2-service">
        <section className="report-v2-service-section">
          <h2>服务进展</h2>
          <p>当前状态：{v2StatusLabelMap[currentV2Status] || currentV2Status}</p>
          <p>建议顾问：{assignment.consultantName || "待确认"}</p>
        </section>

        <section className="report-v2-service-section" id="consultation-request">
          <h2>咨询意向提交</h2>
          <p className="inline-note">咨询意向状态：{consultationStatusLabelMap[consultationStatus] || consultationStatus}</p>
          {consultationRequest.submittedAt ? (
            <p className="inline-note">最近提交：{formatDateTime(consultationRequest.submittedAt)}</p>
          ) : null}

          {canSubmitIntent ? (
            <div className="control-stack">
              <label className="field-block">
                <span className="field-label">手机号</span>
                <input
                  className="text-input"
                  onChange={(event) => setIntentMobile(event.target.value)}
                  placeholder="请输入手机号"
                  type="text"
                  value={intentMobile}
                />
              </label>

              <label className="field-block">
                <span className="field-label">微信号</span>
                <input
                  className="text-input"
                  onChange={(event) => setIntentWechatId(event.target.value)}
                  placeholder="请输入微信号"
                  type="text"
                  value={intentWechatId}
                />
              </label>

              <label className="field-block">
                <span className="field-label">方便联系时间</span>
                <select
                  className="select-input"
                  onChange={(event) => setContactTimePreference(event.target.value)}
                  value={contactTimePreference}
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
                  onChange={(event) => setConsultationNotes(event.target.value)}
                  placeholder="例如：希望确认 9 月插班可行性和英文衔接方案。"
                  rows={4}
                  value={consultationNotes}
                />
              </label>

              <button className="report-v2-primary-btn" disabled={submittingIntent} onClick={submitConsultationIntent} type="button">
                {submittingIntent ? "提交中..." : intentButtonLabel}
              </button>
              {intentMessage ? <p className="report-v2-success">{intentMessage}</p> : null}
              {intentError ? <p className="report-v2-error">{intentError}</p> : null}
            </div>
          ) : (
            <p className="inline-note">当前状态下不支持在线提交咨询意向，如需调整请联系管理员。</p>
          )}
        </section>

        <section className="report-v2-service-section">
          <h2>补资料入口</h2>
          <p className="inline-note">
            {Array.isArray(adminRecord.missingInfo) && adminRecord.missingInfo.length > 0
              ? `待补：${adminRecord.missingInfo.map((item) => missingInfoLabelMap[item] || item).join("、")}`
              : "当前暂无待补资料。"}
          </p>
          {adminRecord.userSupplement?.submittedAt ? (
            <p className="inline-note">最近回填：{formatDateTime(adminRecord.userSupplement.submittedAt)}</p>
          ) : null}

          {canSubmitSupplemental ? (
            <div className="control-stack">
              <label className="field-block">
                <span className="field-label">本次已补齐资料</span>
                <div className="option-grid">
                  {missingInfoOptions.map((item) => (
                    <button
                      className={supplementalProvidedItems.includes(item) ? "option-chip active" : "option-chip"}
                      key={item}
                      onClick={() => setSupplementalProvidedItems((current) => toggleArrayValue(current, item))}
                      type="button"
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
                  onChange={(event) => setSupplementalNotes(event.target.value)}
                  placeholder="例如：成绩单与身份证明已上传，请确认下一步安排。"
                  rows={4}
                  value={supplementalNotes}
                />
              </label>

              <button className="report-v2-primary-btn" disabled={submittingSupplemental} onClick={submitSupplementalInfo} type="button">
                {submittingSupplemental ? "提交中..." : "提交补资料"}
              </button>
              {supplementalMessage ? <p className="report-v2-success">{supplementalMessage}</p> : null}
              {supplementalError ? <p className="report-v2-error">{supplementalError}</p> : null}
            </div>
          ) : (
            <p className="inline-note">当前无需补资料，状态变更后会显示对应入口。</p>
          )}
        </section>
      </section>
    </main>
  );
}
