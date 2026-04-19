'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Clock3,
  Handshake,
  Languages,
  ListChecks,
  School,
  ShieldCheck,
  Target,
  TriangleAlert,
  User
} from "lucide-react";
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

const gradeLabelMap = {
  kindergarten: "幼儿园",
  "g1-g3": "小学 1-3 年级",
  "g4-g6": "小学 4-6 年级",
  "g7-g9": "初中 7-9 年级",
  "g10-g12": "高中 10-12 年级"
};

const chapterConfig = [
  { key: "basicInfo", title: "0. 基本信息", Icon: User },
  { key: "verdict", title: "1. 核心结论 (The Verdict)", Icon: Target },
  { key: "diagnosticDimensions", title: "2. 核心诊断维度", Icon: Activity },
  { key: "recommendedSchools", title: "3. 目标学校穿透建议", Icon: School },
  { key: "criticalWarnings", title: "4. 深度风险预警", Icon: TriangleAlert },
  { key: "nextSteps", title: "5. 后续行动清单", Icon: ListChecks },
  { key: "consultationGuide", title: "6. 专家人工介入引导", Icon: Handshake },
  { key: "meta", title: "7. 诊断依据声明", Icon: ShieldCheck }
];

function resolveCurrentV2Status(lead) {
  return lead?.caseRecord?.status || lead?.adminFollowUpRecord?.status || "report_viewed";
}

function canEditConsultationIntent(v2Status) {
  return !["consult_assigned", "follow_up", "nurturing", "closed"].includes(v2Status);
}

function toggleArrayValue(values, value) {
  if (!Array.isArray(values)) {
    return [value];
  }

  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function toDisplayValue(value, fallback = "未填写") {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function formatDateTime(value) {
  if (!value) {
    return "待更新";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "待更新";
  }

  return date.toLocaleString("zh-CN");
}

function formatDate(value) {
  if (!value) {
    return "待更新";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "待更新";
  }

  return date.toLocaleDateString("zh-CN");
}

function normalizeSchoolItem(item, index) {
  const name = toDisplayValue(item?.school_name || item?.schoolName, `候选学校 ${index + 1}`);

  return {
    school_name: name,
    match_score: item?.match_score ?? item?.matchScore ?? "待评估",
    critical_bottleneck: toDisplayValue(item?.critical_bottleneck || item?.criticalBottleneck, "待补充"),
    insider_tips: toDisplayValue(item?.insider_tips || item?.consultantInsiderTips, "待补充"),
    tuition_hint: toDisplayValue(item?.tuition_hint || item?.tuitionFitNote, "待补充")
  };
}

function normalizeWarningItem(item, index) {
  return {
    title: toDisplayValue(item?.title || item?.warning_title, `风险预警 ${index + 1}`),
    content: toDisplayValue(item?.content || item?.warning_content, "待补充")
  };
}

function resolveRawReportView(lead) {
  return (
    lead?.currentReport?.contentJson?.reportView ||
    lead?.currentReport?.summary?.reportView ||
    lead?.result?.currentReport?.summary?.reportView ||
    null
  );
}

function buildFallbackReportView(lead) {
  const result = lead?.result || {};
  const answers = lead?.answers || {};
  const reportSummary = lead?.currentReport?.summary || result?.currentReport?.summary || {};
  const ruleResult = lead?.diagnosticResult?.ruleResultJson || {};
  const schoolSnapshot = lead?.diagnosticResult?.schoolDataSnapshotJson || {};

  const studentName = toDisplayValue(answers.studentName || lead?.questionnaireResponse?.responseJson?.studentName, "未命名学生");
  const currentGradeRaw = answers.grade || lead?.questionnaireResponse?.responseJson?.currentGrade;
  const currentGrade = gradeLabelMap[currentGradeRaw] || toDisplayValue(currentGradeRaw, "未填写");

  const identityVerdict = toDisplayValue(
    reportSummary.identityVerdict || result.identityVerdict || ruleResult.identityAssessment?.verdict,
    "待评估"
  );
  const budgetMatchSummary = toDisplayValue(reportSummary.budgetMatchSummary || result.budgetMatchSummary, "待评估");

  const verdictHeadline = toDisplayValue(
    result.overview,
    "系统已完成首轮诊断，建议按下方行动清单推进下一步。"
  );
  const verdictMarkdown = [
    `身份判断：${toDisplayValue(ruleResult.identityAssessment?.warning, "当前身份条件不构成直接阻断，可继续推进。")}`,
    `总体风险：${
      Array.isArray(result.riskTags) && result.riskTags.length > 0
        ? result.riskTags.join("、")
        : "当前主要风险可控，可继续推进细化判断"
    }`
  ].join("\n");

  const intakeTimingAnalysis = {
    status: toDisplayValue(reportSummary.intakeWindowVerdict || result.timingVerdict || ruleResult.timingAssessment?.verdict, "待评估"),
    detail: toDisplayValue(
      ruleResult.timingAssessment?.analysis,
      "系统已完成时机初判，建议尽快明确目标学校带并进入执行准备。"
    )
  };

  const englishRisk = {
    level: toDisplayValue(reportSummary.englishRiskLevel || result.englishRiskLevel || ruleResult.englishAssessment?.level, "待评估"),
    current: toDisplayValue(ruleResult.englishAssessment?.userLevelDescription, "待补充"),
    target_barrier: toDisplayValue(ruleResult.englishAssessment?.targetBarrierLabel, "待匹配"),
    advice: toDisplayValue(
      ruleResult.englishAssessment?.bridgeAdvice,
      "建议结合目标学校要求进行针对性衔接准备。"
    )
  };

  const recommendedSchoolsSource =
    (Array.isArray(reportSummary.recommendedSchools) && reportSummary.recommendedSchools.length > 0
      ? reportSummary.recommendedSchools
      : Array.isArray(schoolSnapshot.recommendedSchools)
        ? schoolSnapshot.recommendedSchools
        : []);

  const recommendedSchools = recommendedSchoolsSource.map(normalizeSchoolItem);

  const warningSource =
    Array.isArray(reportSummary.criticalWarnings) && reportSummary.criticalWarnings.length > 0
      ? reportSummary.criticalWarnings
      : [{ title: "当前可继续推进", content: "目前没有触发硬性阻断项，可继续进入顾问细化判断。" }];
  const warningsArray = warningSource.map(normalizeWarningItem);

  const nextActions = Array.isArray(result.nextActions) ? result.nextActions : [];

  const actionPlan = {
    phaseImmediate: [
      nextActions[0] || "先确认目标切入时间与优先路径。",
      nextActions[1] || "围绕预算与学校带，收敛到可执行方案。"
    ],
    phasePreparation: [
      nextActions[2] || "补齐关键材料，建立学校申请清单。",
      nextActions[3] || "安排一次深度咨询，确认最终执行顺序。"
    ]
  };

  const complexityLabel =
    Array.isArray(result.riskTags) && result.riskTags.length > 0
      ? result.riskTags.join("、")
      : "时间窗口与路径判断";

  const consultationGuide = {
    complexity_label: complexityLabel,
    description: `由于你的案例涉及 ${complexityLabel}，建议立即预约资深顾问进行深度评估。`,
    cta_label: "立即预约资深顾问"
  };

  const meta = {
    rules_version: toDisplayValue(lead?.diagnosticJob?.versionSnapshot?.rulesVersion, "V1.0"),
    engine_version: toDisplayValue(lead?.diagnosticJob?.versionSnapshot?.engineVersion, "K12-Expert-Engine"),
    school_snapshot_date: formatDate(
      schoolSnapshot.snapshotDate ||
        schoolSnapshot.dataSnapshotDate ||
        lead?.diagnosticResult?.createdAt ||
        lead?.currentReport?.createdAt
    )
  };

  return {
    basicInfo: {
      student_name: studentName,
      current_grade: currentGrade,
      identity_status: identityVerdict,
      budget_match: budgetMatchSummary
    },
    verdict: {
      verdict: verdictHeadline,
      verdict_markdown: verdictMarkdown
    },
    diagnosticDimensions: {
      intake_timing_analysis: intakeTimingAnalysis,
      english_risk: englishRisk
    },
    recommendedSchools,
    criticalWarnings: warningsArray,
    nextSteps: actionPlan,
    consultationGuide,
    meta
  };
}

function normalizeReportView(rawReportView, fallback) {
  const raw = rawReportView && typeof rawReportView === "object" ? rawReportView : {};

  const basicInfo = {
    student_name: toDisplayValue(raw?.basicInfo?.student_name || raw?.basicInfo?.studentName, fallback.basicInfo.student_name),
    current_grade: toDisplayValue(raw?.basicInfo?.current_grade || raw?.basicInfo?.currentGrade, fallback.basicInfo.current_grade),
    identity_status: toDisplayValue(raw?.basicInfo?.identity_status || raw?.basicInfo?.identityStatus, fallback.basicInfo.identity_status),
    budget_match: toDisplayValue(raw?.basicInfo?.budget_match || raw?.basicInfo?.budgetMatch, fallback.basicInfo.budget_match)
  };

  const verdict = {
    verdict: toDisplayValue(raw?.verdict?.verdict || raw?.verdict, fallback.verdict.verdict),
    verdict_markdown: toDisplayValue(
      raw?.verdict?.verdict_markdown || raw?.verdict?.verdictMarkdown,
      fallback.verdict.verdict_markdown
    )
  };

  const diagnosticDimensions = {
    intake_timing_analysis: {
      status: toDisplayValue(
        raw?.diagnosticDimensions?.intake_timing_analysis?.status || raw?.intake_timing_analysis?.status,
        fallback.diagnosticDimensions.intake_timing_analysis.status
      ),
      detail: toDisplayValue(
        raw?.diagnosticDimensions?.intake_timing_analysis?.detail || raw?.intake_timing_analysis?.detail,
        fallback.diagnosticDimensions.intake_timing_analysis.detail
      )
    },
    english_risk: {
      level: toDisplayValue(
        raw?.diagnosticDimensions?.english_risk?.level || raw?.english_risk?.level,
        fallback.diagnosticDimensions.english_risk.level
      ),
      current: toDisplayValue(
        raw?.diagnosticDimensions?.english_risk?.current || raw?.english_risk?.current,
        fallback.diagnosticDimensions.english_risk.current
      ),
      target_barrier: toDisplayValue(
        raw?.diagnosticDimensions?.english_risk?.target_barrier || raw?.english_risk?.target_barrier,
        fallback.diagnosticDimensions.english_risk.target_barrier
      ),
      advice: toDisplayValue(
        raw?.diagnosticDimensions?.english_risk?.advice || raw?.english_risk?.advice,
        fallback.diagnosticDimensions.english_risk.advice
      )
    }
  };

  const recommendedSchoolsInput = Array.isArray(raw?.recommendedSchools)
    ? raw.recommendedSchools
    : Array.isArray(raw?.schools_array)
      ? raw.schools_array
      : fallback.recommendedSchools;

  const criticalWarningsInput = Array.isArray(raw?.criticalWarnings)
    ? raw.criticalWarnings
    : Array.isArray(raw?.warnings_array)
      ? raw.warnings_array
      : fallback.criticalWarnings;

  const nextSteps = {
    phaseImmediate: Array.isArray(raw?.nextSteps?.phaseImmediate)
      ? raw.nextSteps.phaseImmediate
      : Array.isArray(raw?.action_plan?.phaseImmediate)
        ? raw.action_plan.phaseImmediate
        : fallback.nextSteps.phaseImmediate,
    phasePreparation: Array.isArray(raw?.nextSteps?.phasePreparation)
      ? raw.nextSteps.phasePreparation
      : Array.isArray(raw?.action_plan?.phasePreparation)
        ? raw.action_plan.phasePreparation
        : fallback.nextSteps.phasePreparation
  };

  const consultationGuide = {
    complexity_label: toDisplayValue(
      raw?.consultationGuide?.complexity_label,
      fallback.consultationGuide.complexity_label
    ),
    description: toDisplayValue(raw?.consultationGuide?.description, fallback.consultationGuide.description),
    cta_label: toDisplayValue(raw?.consultationGuide?.cta_label, fallback.consultationGuide.cta_label)
  };

  const meta = {
    rules_version: toDisplayValue(raw?.meta?.rules_version, fallback.meta.rules_version),
    engine_version: toDisplayValue(raw?.meta?.engine_version, fallback.meta.engine_version),
    school_snapshot_date: toDisplayValue(raw?.meta?.school_snapshot_date, fallback.meta.school_snapshot_date)
  };

  return {
    basicInfo,
    verdict,
    diagnosticDimensions,
    recommendedSchools: recommendedSchoolsInput.map(normalizeSchoolItem),
    criticalWarnings: criticalWarningsInput.map(normalizeWarningItem),
    nextSteps,
    consultationGuide,
    meta
  };
}

function SectionTitle({ title, Icon }) {
  return (
    <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <Icon size={18} strokeWidth={2.2} />
      <span>{title}</span>
    </h2>
  );
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
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
    if (!authLoading && !user) {
      const next = encodeURIComponent(appPath(`/result/${params?.submissionId || ""}`));
      router.replace(appPath(`/login?next=${next}`));
    }
  }, [authLoading, user, router, params?.submissionId]);

  useEffect(() => {
    async function fetchLead() {
      if (!params?.submissionId) {
        return;
      }

      try {
        const response = await fetch(apiPath(`/api/results/${params.submissionId}`), {
          cache: "no-store"
        });

        if (response.status === 404) {
          setLead(null);
          return;
        }

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload?.message || "获取结果失败");
        }

        const payload = await response.json();
        setLead(payload.lead || null);
      } catch (error) {
        setFetchError(error instanceof Error ? error.message : "获取结果失败");
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading && user) {
      fetchLead();
    }
  }, [params?.submissionId, authLoading, user]);

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

  const currentV2Status = resolveCurrentV2Status(lead);

  const reportView = useMemo(() => {
    if (!lead) {
      return null;
    }

    const fallback = buildFallbackReportView(lead);
    const rawReportView = resolveRawReportView(lead);
    return normalizeReportView(rawReportView, fallback);
  }, [lead]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!lead || !reportView) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">{fetchError || "未找到对应结果"}</div>
      </div>
    );
  }

  const consultantKey = user.consultant_id || user.consultantId || user.id;
  const isOwner = lead.userId === user.id || lead.user_id === user.id || lead.answers?.userId === user.id;
  const canView =
    (canViewOwnLeads && isOwner) ||
    canViewAllLeads ||
    (canViewAssignedLeads &&
      (lead.assignedConsultantId === consultantKey || lead.assigned_consultant_id === consultantKey));

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">无权限查看此结果</div>
      </div>
    );
  }

  const assignment = lead.assignment || {};
  const consultationRequest = lead.consultationRequest || {};
  const adminRecord = lead.adminFollowUpRecord || {};
  const consultationStatus = consultationRequest.requestStatus || "not_requested";
  const canSubmitIntent = isOwner && canEditConsultationIntent(currentV2Status);
  const canSubmitSupplemental = isOwner && currentV2Status === "awaiting_user_info";
  const missingInfoOptions =
    Array.isArray(adminRecord.missingInfo) && adminRecord.missingInfo.length > 0
      ? adminRecord.missingInfo
      : Object.keys(missingInfoLabelMap);
  const intentButtonLabel = consultationStatus === "submitted" ? "更新咨询意向" : "确认并提交咨询意向";
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

  function renderChapter(key) {
    if (key === "basicInfo") {
      return (
        <ul className="report-v2-list">
          <li>
            <strong>学生主体：</strong>
            {reportView.basicInfo.student_name}
          </li>
          <li>
            <strong>当前年级：</strong>
            {reportView.basicInfo.current_grade}
          </li>
          <li>
            <strong>身份状态：</strong>
            {reportView.basicInfo.identity_status}
          </li>
          <li>
            <strong>预算匹配：</strong>
            {reportView.basicInfo.budget_match}
          </li>
        </ul>
      );
    }

    if (key === "verdict") {
      return (
        <>
          <p>{reportView.verdict.verdict}</p>
          <blockquote className="report-v2-quote" style={{ whiteSpace: "pre-line" }}>
            {reportView.verdict.verdict_markdown}
          </blockquote>
        </>
      );
    }

    if (key === "diagnosticDimensions") {
      return (
        <>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock3 size={16} />
            <span>2.1 申请时机与窗口</span>
          </h3>
          <ul className="report-v2-list">
            <li>
              <strong>判定状态：</strong>
              {reportView.diagnosticDimensions.intake_timing_analysis.status}
            </li>
            <li>
              <strong>详细评估：</strong>
              {reportView.diagnosticDimensions.intake_timing_analysis.detail}
            </li>
          </ul>

          <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Languages size={16} />
            <span>2.2 语言衔接风险</span>
          </h3>
          <ul className="report-v2-list">
            <li>
              <strong>预警等级：</strong>
              {reportView.diagnosticDimensions.english_risk.level}
            </li>
            <li>
              <strong>用户当前：</strong>
              {reportView.diagnosticDimensions.english_risk.current}
            </li>
            <li>
              <strong>目标池门槛：</strong>
              {reportView.diagnosticDimensions.english_risk.target_barrier}
            </li>
            <li>
              <strong>专家建议：</strong>
              {reportView.diagnosticDimensions.english_risk.advice}
            </li>
          </ul>
        </>
      );
    }

    if (key === "recommendedSchools") {
      return reportView.recommendedSchools.length > 0 ? (
        <div className="report-v2-school-list">
          {reportView.recommendedSchools.map((school, index) => (
            <div className="report-v2-school-item" key={`${school.school_name}-${index + 1}`}>
              <h3>{school.school_name}</h3>
              <ul className="report-v2-list">
                <li>
                  <strong>适配度评估：</strong>
                  {school.match_score} / 10
                </li>
                <li>
                  <strong>关键卡点：</strong>
                  {school.critical_bottleneck}
                </li>
                <li>
                  <strong>顾问私货：</strong>
                  {school.insider_tips}
                </li>
                <li>
                  <strong>学费提示：</strong>
                  {school.tuition_hint}
                </li>
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p>当前暂无可展示学校建议，建议先提交咨询意向由顾问补全。</p>
      );
    }

    if (key === "criticalWarnings") {
      return (
        <ul className="report-v2-list">
          {reportView.criticalWarnings.map((warning, index) => (
            <li key={`${warning.title}-${index + 1}`}>
              <strong>{warning.title}：</strong>
              {warning.content}
            </li>
          ))}
        </ul>
      );
    }

    if (key === "nextSteps") {
      return (
        <>
          <h3>第一阶段：立即执行 (下一步 24 小时)</h3>
          <ol className="report-v2-ordered">
            {reportView.nextSteps.phaseImmediate.map((item, index) => (
              <li key={`immediate-${index + 1}`}>{toDisplayValue(item, "待补充")}</li>
            ))}
          </ol>

          <h3>第二阶段：资料储备 (1-2 周)</h3>
          <ol className="report-v2-ordered">
            {reportView.nextSteps.phasePreparation.map((item, index) => (
              <li key={`prep-${index + 1}`}>{toDisplayValue(item, "待补充")}</li>
            ))}
          </ol>
        </>
      );
    }

    if (key === "consultationGuide") {
      return (
        <>
          <blockquote className="report-v2-quote">
            <p>
              <strong>{reportView.consultationGuide.description}</strong>
            </p>
          </blockquote>
          <div className="report-v2-consult-line">
            <button
              className="report-v2-consult-btn"
              disabled={submittingIntent || !canSubmitIntent}
              onClick={handleConsultEntry}
              type="button"
            >
              {submittingIntent ? "提交中..." : reportView.consultationGuide.cta_label}
            </button>
          </div>
          {intentError ? <p className="report-v2-error">{intentError}</p> : null}
          {intentMessage ? <p className="report-v2-success">{intentMessage}</p> : null}
        </>
      );
    }

    return (
      <ul className="report-v2-list">
        <li>
          <strong>规则版本：</strong>
          {reportView.meta.rules_version}
        </li>
        <li>
          <strong>模型引擎：</strong>
          {reportView.meta.engine_version}
        </li>
        <li>
          <strong>学校库快照：</strong>
          {reportView.meta.school_snapshot_date}
        </li>
      </ul>
    );
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

        {chapterConfig.map((chapter) => (
          <section
            className={chapter.key === "meta" ? "report-v2-section report-v2-section--last" : "report-v2-section"}
            key={chapter.key}
          >
            <SectionTitle title={chapter.title} Icon={chapter.Icon} />
            {renderChapter(chapter.key)}
          </section>
        ))}
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
