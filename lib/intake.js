import { getFieldLabel, getOptionLabel } from "./schema.js";

export const pathCopy = {
  local: {
    label: "香港本地学校插班路径",
    summary: "更适合先围绕本地学校切入，重点看时间窗口、身份条件和适应成本。 "
  },
  international: {
    label: "香港国际学校路径",
    summary: "更适合优先评估国际学校方向，核心是语言基础、预算承受力和目标节奏。 "
  },
  bilingual: {
    label: "双语 / 过渡路径",
    summary: "目前更适合先通过双语或过渡方案做衔接，先把切入门槛降到可执行范围。 "
  },
  prepare: {
    label: "延后切入，先做准备路径",
    summary: "现在更建议先做准备，再择机切入香港，避免时间和资源投入过早失真。 "
  },
  pause: {
    label: "当前不建议立即推进路径",
    summary: "现阶段直接推进的匹配度不高，建议先处理关键阻碍，再评估是否启动。 "
  }
};

export const diagnosisVersionSnapshot = {
  questionnaireVersion: "compat-v2-2026-04-17",
  rulesVersion: "logic-rules-v1",
  reportTemplateVersion: "diagnosis-report-v1.2",
  engineVersion: "k12-expert-engine-v2"
};

const scoreMaps = {
  urgency: {
    urgent: 5,
    year: 4,
    "two-years": 2,
    explore: 1
  },
  budget: {
    "300k-plus": 5,
    "150k-300k": 4,
    "80k-150k": 3,
    "under-80k": 2
  },
  intent: {
    high: 5,
    medium: 3,
    low: 1
  }
};

const concernToLegacyMap = {
  english_gap: "adaptation",
  adaptation: "adaptation",
  school_choice: "unclear",
  path_unclear: "unclear",
  timing: "timing",
  budget: "cost",
  identity: "identity",
  other: "unclear"
};

const longTermGoalToPath = {
  hk_path: "local",
  hybrid_path: "bilingual",
  intl_overseas: "international",
  unsure: "unsure"
};

const willingnessToDrive = {
  willing: "high",
  acceptable: "medium",
  resistant: "low",
  unsure: "medium"
};

const willingnessToAcceptance = {
  willing: "yes",
  acceptable: "yes",
  resistant: "no",
  unsure: "maybe"
};

const identityToLegacy = {
  planning: "planning",
  approved_talent: "yes",
  dependant: "yes",
  permanent_resident: "yes",
  one_way_permit: "yes",
  other_visa: "no"
};

const englishToLegacy = {
  weak: "weak",
  ket: "basic",
  pet: "good",
  fce_plus: "strong"
};

const performanceToLegacy = {
  top: "top",
  upper: "upper",
  middle: "middle",
  lower: "lower",
  unknown: "middle"
};

function normalizeConcerns(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function fallbackContactName(rawAnswers) {
  if (rawAnswers.parent_name && rawAnswers.parent_name.trim()) {
    return rawAnswers.parent_name.trim();
  }

  if (rawAnswers.contactName && rawAnswers.contactName.trim()) {
    return rawAnswers.contactName.trim();
  }

  return "家长";
}

function formatContactMethod(rawAnswers) {
  const mobile = rawAnswers.mobile?.trim() || "";
  const wechat = rawAnswers.wechat_id?.trim() || "";

  if (mobile && wechat) {
    return `${mobile} / ${wechat}`;
  }

  if (mobile || wechat) {
    return mobile || wechat;
  }

  return rawAnswers.contactMethod?.trim() || "";
}

function deriveSubjectRisk(legacyConcerns, rawAnswers) {
  if (legacyConcerns.includes("timing") && rawAnswers.school_performance_level === "lower") {
    return "major";
  }

  if (legacyConcerns.includes("adaptation") || rawAnswers.school_performance_level === "lower") {
    return "minor";
  }

  return "none";
}

function mapTimeline(value) {
  const map = {
    urgent: "urgent",
    year: "year",
    "two-years": "two-years",
    explore: "explore"
  };

  return map[value] ?? "year";
}

function mapBudget(value) {
  const map = {
    "under-80k": "under-80k",
    "80k-150k": "80k-150k",
    "150k-300k": "150k-300k",
    "300k-plus": "300k-plus",
    unknown: "150k-300k"
  };

  return map[value] ?? "150k-300k";
}

function gradeLabel(value) {
  const map = {
    kindergarten: "幼儿园",
    "g1-g3": "小学 1-3 年级",
    "g4-g6": "小学 4-6 年级",
    "g7-g9": "初中 7-9 年级",
    "g10-g12": "高中 10-12 年级"
  };

  return map[value] || value || "未填写";
}

export function normalizeInputAnswers(rawAnswers, tracking = {}) {
  const concerns = normalizeConcerns(rawAnswers.main_concerns);
  const legacyConcerns = concerns.map((item) => concernToLegacyMap[item] || "unclear");
  const biggestConcern = legacyConcerns[0] || "unclear";
  const preferredPath =
    rawAnswers.preferredPath ||
    longTermGoalToPath[rawAnswers.long_term_goal] ||
    (rawAnswers.long_term_goal === "unsure" ? "unsure" : "bilingual");
  const consultationIntent =
    rawAnswers.consultationIntent || rawAnswers.consultation_intent || rawAnswers.consultation_intent_level || "medium";
  const contactWindow = rawAnswers.contactWindow || rawAnswers.contact_window || "flexible";
  const sourceChannel = rawAnswers.sourceChannel || rawAnswers.source_channel || tracking.utmSource || "direct";
  const identityRaw = rawAnswers.hkIdentity || rawAnswers.identity_type || "planning";
  const englishRaw = rawAnswers.englishLevel || rawAnswers.english_level || "pet";
  const gradeRaw = rawAnswers.grade || rawAnswers.current_grade || "g4-g6";
  const schoolSystemRaw = rawAnswers.currentSchoolType || rawAnswers.school_system || "public";
  const performanceRaw = rawAnswers.academicLevel || rawAnswers.school_performance_level || "middle";
  const childWillingnessRaw = rawAnswers.child_willingness || "acceptable";

  return {
    studentName: rawAnswers.studentName || rawAnswers.student_name || "未命名学生",
    grade: gradeRaw,
    location: rawAnswers.location || rawAnswers.current_city || "",
    currentSchoolType: schoolSystemRaw,
    hkIdentity: identityToLegacy[identityRaw] || rawAnswers.hkIdentity || "planning",
    academicLevel: performanceToLegacy[performanceRaw] || "middle",
    englishLevel: englishToLegacy[englishRaw] || "good",
    subjectRisk: rawAnswers.subjectRisk || deriveSubjectRisk(legacyConcerns, rawAnswers),
    selfDrive: rawAnswers.selfDrive || willingnessToDrive[childWillingnessRaw] || "medium",
    motivation: rawAnswers.motivation || rawAnswers.main_concern_details || rawAnswers.other_concern || "",
    preferredPath,
    timeline: mapTimeline(rawAnswers.timeline || rawAnswers.target_intake),
    transitionAcceptance: rawAnswers.transitionAcceptance || willingnessToAcceptance[childWillingnessRaw] || "maybe",
    budget: mapBudget(rawAnswers.budget || rawAnswers.tuition_budget),
    residencyFlex: rawAnswers.residencyFlex || (identityRaw === "planning" ? "low" : "partial"),
    parentPriority:
      rawAnswers.parentPriority ||
      (rawAnswers.long_term_goal === "hk_path"
        ? "academic"
        : rawAnswers.long_term_goal === "intl_overseas"
          ? "language"
          : "balance"),
    biggestConcern: rawAnswers.biggestConcern || biggestConcern,
    consultationIntent,
    contactName: fallbackContactName(rawAnswers),
    contactMethod: formatContactMethod(rawAnswers),
    contactWindow,
    sourceChannel,
    userId: rawAnswers.userId ?? null,
    // V2 extra fields kept for downstream use/debugging.
    identityTypeRaw: identityRaw,
    teachingLanguageRaw: rawAnswers.teaching_language || "",
    englishExamRaw: rawAnswers.cambridge_exam_result || "",
    otherEnglishScoresRaw: rawAnswers.other_english_scores || "",
    longTermGoalRaw: rawAnswers.long_term_goal || "",
    concernsRaw: concerns,
    childWillingnessRaw
  };
}

function complexityScore(answers) {
  let score = 1;

  if (answers.hkIdentity === "no") {
    score += 1;
  }

  if (answers.transitionAcceptance === "no") {
    score += 1;
  }

  if (answers.subjectRisk === "major") {
    score += 1;
  }

  if (answers.residencyFlex === "low") {
    score += 1;
  }

  if (answers.biggestConcern === "identity" || answers.biggestConcern === "timing") {
    score += 1;
  }

  return Math.min(score, 5);
}

function pickPrimaryPath(answers) {
  if (
    answers.preferredPath === "international" &&
    ["strong", "good"].includes(answers.englishLevel) &&
    ["150k-300k", "300k-plus"].includes(answers.budget)
  ) {
    return "international";
  }

  if (
    answers.preferredPath === "local" &&
    answers.hkIdentity !== "no" &&
    answers.transitionAcceptance !== "no"
  ) {
    return "local";
  }

  if (
    answers.englishLevel === "weak" ||
    answers.transitionAcceptance === "maybe" ||
    answers.currentSchoolType === "public"
  ) {
    return "bilingual";
  }

  if (
    answers.timeline === "explore" ||
    answers.consultationIntent === "low" ||
    answers.selfDrive === "low"
  ) {
    return "prepare";
  }

  if (
    answers.budget === "under-80k" &&
    answers.residencyFlex === "low" &&
    answers.hkIdentity === "no"
  ) {
    return "pause";
  }

  if (answers.preferredPath === "local") {
    return "local";
  }

  if (answers.preferredPath === "international") {
    return "international";
  }

  return "bilingual";
}

function buildLegacyResult(answers) {
  const scores = calculateScores(answers);
  const primaryPath = pickPrimaryPath(answers);
  const riskTags = collectRiskTags(answers, scores);
  const actions = nextActions(primaryPath, answers, riskTags);
  const consultantType =
    scores.complexity >= 4
      ? "特殊案例顾问"
      : primaryPath === "international" || scores.budget >= 4
        ? "高级顾问"
        : "标准顾问";

  return {
    primaryPath,
    primaryPathLabel: pathCopy[primaryPath].label,
    pathSummary: pathCopy[primaryPath].summary,
    riskTags,
    nextActions: actions,
    scores,
    consultantType,
    overview: `综合当前年级、语言基础、预算和推进意愿，系统判断你们现阶段更适合先走“${pathCopy[primaryPath].label}”方向，再由顾问做进一步细化。`
  };
}

function mapIdentityStatus(answers) {
  if (answers.hkIdentity === "yes") {
    return {
      input: "已有香港身份",
      verdict: "资格全开",
      warning: "",
      blocked: false
    };
  }

  if (answers.hkIdentity === "planning") {
    return {
      input: "正在规划身份",
      verdict: "可先诊断，但正式入读前仍需落实身份",
      warning: "当前仍属于身份待确认阶段，报告结论可用于择校判断，但正式入学动作需要以身份获批为前提。",
      blocked: false
    };
  }

  return {
    input: "暂时没有明确身份",
    verdict: "资格受限，建议先补身份路径判断",
    warning: "当前身份条件会直接影响学校可报范围，应把身份规划作为首要前置动作。",
    blocked: true
  };
}

function mapBudgetBand(budget) {
  const map = {
    "under-80k": { summary: "预算主要覆盖官津或低学费路径", upper: 80000, label: "8 万以下" },
    "80k-150k": { summary: "预算可覆盖直资与部分私立学校", upper: 150000, label: "8-15 万" },
    "150k-300k": { summary: "预算可覆盖主流国际与较高配路径", upper: 300000, label: "15-30 万" },
    "300k-plus": { summary: "预算约束较小，可优先按匹配度筛选", upper: 500000, label: "30 万以上" }
  };

  return map[budget] ?? { summary: "预算信息暂不完整，建议在首咨中补齐。", upper: 0, label: "未明确" };
}

function mapEnglishScore(level) {
  const map = {
    weak: 1,
    basic: 2,
    good: 3,
    strong: 4
  };

  return map[level] ?? 2;
}

function mapEnglishDescription(level) {
  const map = {
    weak: "目前英文基础较弱，阅读写作仍需明显补足",
    basic: "已有一定英文基础，但稳定性和输出能力仍需强化",
    good: "英文基础较好，具备继续强化并承接更高要求的条件",
    strong: "英文基础较强，可较好承接英文授课环境"
  };

  return map[level] ?? "英文水平待补充";
}

function mapTargetBarrier(primaryPath) {
  const map = {
    local: { barrier: 6, label: "本地学校主流插班门槛" },
    international: { barrier: 8, label: "国际学校英文授课门槛" },
    bilingual: { barrier: 5, label: "双语 / 过渡路径门槛" },
    prepare: { barrier: 4, label: "准备期目标池门槛" },
    pause: { barrier: 4, label: "低强度观察池门槛" }
  };

  return map[primaryPath] ?? map.bilingual;
}

function assessTimingWindow(answers, now = new Date()) {
  const month = now.getMonth() + 1;
  const monthBias =
    month >= 9 && month <= 11
      ? "直资/私立/国际首轮高峰"
      : month === 12 || month === 1
        ? "首轮尾声 / 官津自行分配"
        : month >= 2 && month <= 4
          ? "插班黄金期"
          : month >= 5 && month <= 7
            ? "紧急补录期"
            : "逾期 / 极速救火";

  if (answers.timeline === "two-years" || answers.timeline === "explore") {
    return {
      verdict: "黄金储备期",
      analysis: `当前处于“${monthBias}”阶段，但你们的入学计划还不算迫近，更适合先做能力储备、学校带筛选和身份路径确认。`,
      urgencyBand: "long_term"
    };
  }

  if (answers.timeline === "year") {
    return {
      verdict: "核心申请期",
      analysis: `以当前时间点看，系统会把你们归到“${monthBias}”主线下处理，建议尽快明确目标学校带并进入材料准备。`,
      urgencyBand: "core_window"
    };
  }

  return {
    verdict: month === 8 ? "逾期 / 极速救火" : "紧急补录期",
    analysis: `当前计划切入时间较近，而系统月份矩阵显示现在属于“${monthBias}”阶段，后续策略应明显偏向补录、保底与高频跟进。`,
    urgencyBand: "urgent"
  };
}

function assessEnglishRisk(answers, legacyResult) {
  const { barrier, label } = mapTargetBarrier(legacyResult.primaryPath);
  const englishBase = mapEnglishScore(answers.englishLevel);
  let riskValue = barrier - englishBase * 2;

  if (answers.subjectRisk === "major") {
    riskValue += 1.5;
  } else if (answers.subjectRisk === "minor") {
    riskValue += 0.5;
  }

  if (answers.selfDrive === "low") {
    riskValue += 1;
  }

  if (answers.currentSchoolType === "public") {
    riskValue += 0.5;
  }

  let level = "低风险";
  let advice = "当前更适合尽快进入学校筛选与面试准备。";

  if (riskValue > 4) {
    level = "极高风险";
    advice = "建议先把英文和学术适应补强作为前置动作，否则后续选校会出现明显失真。";
  } else if (riskValue >= 1) {
    level = "中危衔接";
    advice = "建议预留 3-6 个月做英文与学术过渡，把目标校池控制在更可执行的范围内。";
  }

  return {
    riskValue: Number(riskValue.toFixed(1)),
    level,
    targetBarrierLabel: label,
    userLevelDescription: mapEnglishDescription(answers.englishLevel),
    bridgeAdvice: advice
  };
}

function buildSchoolRecommendations(answers, legacyResult, englishAssessment) {
  const primaryCopy = {
    local: {
      schoolName: "本地学校插班池（待学校库接入后细化）",
      bottleneck: answers.hkIdentity === "yes" ? "重点在时间窗口和面试准备" : "身份条件会直接限制实际可报范围",
      insider: "更适合先把可接受的区域、通勤与陪读安排缩小，再进入具体学校筛选。"
    },
    international: {
      schoolName: "国际学校目标池（待学校库接入后细化）",
      bottleneck: englishAssessment.level === "低风险" ? "主要看预算和梯队定位" : "英文衔接与预算是两道核心门槛",
      insider: "先确定学费上限和目标梯队，避免把大量精力耗在不在预算带内的学校。"
    },
    bilingual: {
      schoolName: "双语 / 过渡路径池（待学校库接入后细化）",
      bottleneck: "要平衡当前衔接压力和未来升学路径",
      insider: "这类学校更适合用来换取时间，先让孩子站稳，再决定下一跳。"
    },
    prepare: {
      schoolName: "准备期观察池（待学校库接入后细化）",
      bottleneck: "当前不是具体选校，而是先把关键短板补齐",
      insider: "如果现在就硬推申请，信息很多但结论会发虚，先做准备反而更省成本。"
    },
    pause: {
      schoolName: "低强度观察池（待学校库接入后细化）",
      bottleneck: "身份、预算和推进意愿目前都不足以支撑立即行动",
      insider: "建议先聚焦身份路径或预算策略，否则选校动作会不断返工。"
    }
  };

  const entry = primaryCopy[legacyResult.primaryPath] ?? primaryCopy.bilingual;
  const matchScore = Math.max(4, Math.min(9, Math.round(10 - englishAssessment.riskValue)));

  return [
    {
      schoolName: entry.schoolName,
      matchScore,
      criticalBottleneck: entry.bottleneck,
      consultantInsiderTips: entry.insider,
      tuitionFitNote: mapBudgetBand(answers.budget).summary
    }
  ];
}

function buildCriticalWarnings(identityAssessment, timingAssessment, englishAssessment, legacyResult) {
  const warnings = [];

  if (identityAssessment.warning) {
    warnings.push({
      title: "身份前置条件",
      content: identityAssessment.warning
    });
  }

  if (timingAssessment.urgencyBand === "urgent") {
    warnings.push({
      title: "时间窗口偏紧",
      content: "当前案例更像补录或抢时间窗口，不适合再做过长周期的信息对比。"
    });
  }

  if (englishAssessment.level !== "低风险") {
    warnings.push({
      title: "英文衔接压力",
      content: englishAssessment.bridgeAdvice
    });
  }

  if (legacyResult.riskTags.includes("预算偏紧")) {
    warnings.push({
      title: "预算边界",
      content: "后续筛校必须把预算放在前面，不然容易出现路径看起来可行、落地时却不成立的情况。"
    });
  }

  return warnings.slice(0, 4);
}

function buildQuestionnaireRecord(rawAnswers, answers, tracking = {}) {
  const rawMobile = rawAnswers.mobile?.trim() || "";
  const rawWechat = rawAnswers.wechat_id?.trim() || "";
  const contactValue = answers.contactMethod?.trim() || "";
  const derivedMobile = /^\+?\d[\d\s-]{5,}$/.test(contactValue) ? contactValue : "";

  return {
    questionnaireVersion: diagnosisVersionSnapshot.questionnaireVersion,
    studentName: rawAnswers.student_name || answers.studentName,
    currentGrade: rawAnswers.current_grade || answers.grade,
    currentCity: rawAnswers.current_city || answers.location,
    schoolSystem: rawAnswers.school_system || answers.currentSchoolType,
    teachingLanguage:
      rawAnswers.teaching_language ||
      (answers.currentSchoolType === "international"
        ? "english"
        : answers.currentSchoolType === "bilingual"
          ? "bilingual"
          : "chinese"),
    schoolPerformanceLevel: rawAnswers.school_performance_level || answers.academicLevel,
    englishLevel: rawAnswers.english_level || answers.englishLevel,
    cambridgeExamResult: rawAnswers.cambridge_exam_result || answers.englishExamRaw || "",
    otherEnglishScores: rawAnswers.other_english_scores || answers.otherEnglishScoresRaw || "",
    targetIntake: rawAnswers.target_intake || answers.timeline,
    longTermGoal: rawAnswers.long_term_goal || answers.longTermGoalRaw || answers.preferredPath,
    tuitionBudget: rawAnswers.tuition_budget || answers.budget,
    mainConcerns: normalizeConcerns(rawAnswers.main_concerns).length
      ? normalizeConcerns(rawAnswers.main_concerns)
      : answers.concernsRaw || [],
    mainConcernDetails: rawAnswers.main_concern_details || answers.motivation || "",
    childWillingness: rawAnswers.child_willingness || answers.childWillingnessRaw || "acceptable",
    contactName: answers.contactName,
    mobile: rawMobile || derivedMobile,
    wechatId: rawWechat || (rawMobile ? "" : contactValue),
    preferredContactWindow: rawAnswers.contact_window || answers.contactWindow,
    sourceChannel: rawAnswers.source_channel || answers.sourceChannel,
    tracking,
    rawAnswers
  };
}

function buildReportMarkdown({ questionnaire, legacyResult, identityAssessment, timingAssessment, englishAssessment, schoolRecommendations, criticalWarnings }) {
  const action1 = legacyResult.nextActions[0] || "先确认切入时间和学校路径。";
  const action2 = legacyResult.nextActions[1] || "尽快补齐身份、预算与语言准备信息。";
  const action3 = legacyResult.nextActions[2] || "梳理目标学校带，形成可执行 shortlist。";
  const action4 = legacyResult.nextActions[3] || "安排一次深度首咨，把动作顺序排清楚。";

  const schoolSection = schoolRecommendations
    .map(
      (school) =>
        `### ${school.schoolName}\n- **适配度评估**：${school.matchScore} / 10\n- **关键卡点**：${school.criticalBottleneck}\n- **顾问私货**：${school.consultantInsiderTips}\n- **学费提示**：${school.tuitionFitNote}`
    )
    .join("\n\n");

  const warningSection =
    criticalWarnings.length > 0
      ? criticalWarnings.map((warning) => `- **${warning.title}**：${warning.content}`).join("\n")
      : "- **暂无硬性阻断项**：当前更建议尽快进入细化择校和执行准备。";

  return [
    "# 香港转学 AI 诊断报告",
    "",
    "## 0. 基本信息",
    `- **学生主体**：${questionnaire.studentName}`,
    `- **当前年级**：${gradeLabel(questionnaire.currentGrade)}`,
    `- **身份状态**：${identityAssessment.verdict}`,
    `- **预算匹配**：${mapBudgetBand(questionnaire.tuitionBudget).summary}`,
    "",
    "## 1. 核心结论 (The Verdict)",
    legacyResult.overview,
    "",
    "> **AI 专家判定**：",
    `> ${identityAssessment.warning || "当前身份条件不构成直接阻断，可继续推进下一步判断。"}`,
    `> ${legacyResult.riskTags.join("、") || "当前主要风险可控"}`,
    "",
    "## 2. 核心诊断维度",
    "",
    "### 2.1 申请时机与窗口 (Intake Timing)",
    `- **判定状态**：${timingAssessment.verdict}`,
    `- **详细评估**：${timingAssessment.analysis}`,
    "",
    "### 2.2 语言衔接风险 (English Gap)",
    `- **预警等级**：${englishAssessment.level}`,
    `- **用户当前**：${englishAssessment.userLevelDescription}`,
    `- **目标池门槛**：${englishAssessment.targetBarrierLabel}`,
    `- **专家建议**：${englishAssessment.bridgeAdvice}`,
    "",
    "## 3. 目标学校穿透建议 (Target School Drilldown)",
    schoolSection,
    "",
    "## 4. 深度风险预警 (Critical Alerts)",
    warningSection,
    "",
    "## 5. 后续行动清单 (Next Steps)",
    "",
    "### 第一阶段：立即执行 (下一步 24 小时)",
    `1. ${action1}`,
    `2. ${action2}`,
    "",
    "### 第二阶段：资料储备 (1-2 周)",
    `1. ${action3}`,
    `2. ${action4}`,
    "",
    "## 6. 专家人工介入引导 (Convert to Consultation)",
    "",
    `> **由于你的案例涉及 ${legacyResult.riskTags.join("、") || "时间窗口与路径判断"}，建议尽快预约资深顾问进行深度评估。**`,
    "",
    "## 7. 诊断依据声明",
    `- 规则版本：${diagnosisVersionSnapshot.rulesVersion}`,
    `- 模型引擎：${diagnosisVersionSnapshot.engineVersion}`,
    `- 学校库快照：待接入学校数据库后补齐`
  ].join("\n");
}

export function buildV2LeadArtifacts(answers, options = {}) {
  const nowIso = options.nowIso || new Date().toISOString();
  const now = new Date(nowIso);
  const tracking = options.tracking || {};
  const normalizedAnswers = normalizeInputAnswers(answers, tracking);
  const questionnaire = buildQuestionnaireRecord(answers, normalizedAnswers, tracking);
  const legacyResult = buildLegacyResult(normalizedAnswers);
  const identityAssessment = mapIdentityStatus(normalizedAnswers);
  const timingAssessment = assessTimingWindow(normalizedAnswers, now);
  const englishAssessment = assessEnglishRisk(normalizedAnswers, legacyResult);
  const schoolRecommendations = buildSchoolRecommendations(normalizedAnswers, legacyResult, englishAssessment);
  const criticalWarnings = buildCriticalWarnings(identityAssessment, timingAssessment, englishAssessment, legacyResult);
  const budget = mapBudgetBand(normalizedAnswers.budget);
  const internalTags = [
    identityAssessment.blocked ? "TAG_ELIGIBILITY_BLOCK" : null,
    timingAssessment.urgencyBand === "urgent" ? "TAG_LAST_CHANCE" : null,
    englishAssessment.level === "极高风险" ? "TAG_ENGLISH_RISK_HIGH" : null,
    legacyResult.riskTags.includes("预算偏紧") ? "TAG_BUDGET_ALARM" : null,
    normalizedAnswers.preferredPath === "unsure" ? "TAG_PATH_MISMATCH" : null
  ].filter(Boolean);

  const reportMarkdown = buildReportMarkdown({
    questionnaire,
    legacyResult,
    identityAssessment,
    timingAssessment,
    englishAssessment,
    schoolRecommendations,
    criticalWarnings
  });

  return {
    questionnaireResponse: {
      version: diagnosisVersionSnapshot.questionnaireVersion,
      submittedAt: nowIso,
      responseJson: questionnaire
    },
    diagnosticJob: {
      status: "succeeded",
      startedAt: nowIso,
      finishedAt: nowIso,
      versionSnapshot: diagnosisVersionSnapshot
    },
    diagnosticResult: {
      ruleResultJson: {
        identityAssessment,
        timingAssessment,
        englishAssessment,
        budgetAssessment: budget,
        primaryPath: legacyResult.primaryPath
      },
      schoolDataSnapshotJson: {
        source: "pending-school-import",
        recommendedSchools: schoolRecommendations
      },
      recommendationTags: {
        internalTags,
        riskTags: legacyResult.riskTags,
        nextActions: legacyResult.nextActions
      },
      createdAt: nowIso
    },
    currentReport: {
      reportVersion: 1,
      reportType: "ai_draft",
      createdAt: nowIso,
      isVisibleToUser: true,
      contentMarkdown: reportMarkdown,
      summary: {
        identityVerdict: identityAssessment.verdict,
        budgetMatchSummary: budget.summary,
        intakeWindowVerdict: timingAssessment.verdict,
        englishRiskLevel: englishAssessment.level,
        criticalWarnings,
        recommendedSchools: schoolRecommendations
      }
    },
    consultationRequest: {
      requestStatus: normalizedAnswers.consultationIntent === "low" ? "not_requested" : "draft",
      contactTimePreference: normalizedAnswers.contactWindow,
      notes: normalizedAnswers.motivation || "",
      submittedAt: null
    },
    adminFollowUpRecord: {
      status: "report_viewed",
      handoffSummary: "",
      followUpNotes: [],
      updatedAt: nowIso
    },
    normalizedAnswers,
    result: {
      ...legacyResult,
      identityVerdict: identityAssessment.verdict,
      timingVerdict: timingAssessment.verdict,
      englishRiskLevel: englishAssessment.level,
      budgetMatchSummary: budget.summary,
      internalTags,
      currentReport: {
        reportType: "ai_draft",
        reportVersion: 1,
        summary: {
          identityVerdict: identityAssessment.verdict,
          intakeWindowVerdict: timingAssessment.verdict,
          englishRiskLevel: englishAssessment.level
        }
      },
      versionSnapshot: diagnosisVersionSnapshot
    }
  };
}

function collectRiskTags(answers, scores) {
  const tags = [];

  if (scores.urgency >= 4) tags.push("时间窗口紧");
  if (["basic", "weak"].includes(answers.englishLevel)) tags.push("英语基础弱");
  if (["under-80k", "80k-150k"].includes(answers.budget)) tags.push("预算偏紧");
  if (answers.preferredPath === "unsure" || answers.biggestConcern === "unclear") tags.push("路径认知不清");
  if (answers.residencyFlex === "low" || answers.transitionAcceptance === "no") tags.push("适应风险高");
  if (answers.hkIdentity === "no") tags.push("身份因素复杂");
  if (answers.subjectRisk === "major" || answers.selfDrive === "low") tags.push("学业基础待补强");
  if (answers.consultationIntent === "low") tags.push("决策链条长");

  return tags.slice(0, 5);
}

function nextActions(path, answers, riskTags) {
  const actions = [
    "先确认目标切入时间点，以及是否接受插班或过渡方案。",
    "结合当前预算和家庭安排，缩小到可执行的学校带和方案带。"
  ];

  if (["basic", "weak"].includes(answers.englishLevel)) {
    actions.unshift("优先补齐英语和基础学业评估，避免后续路线判断失真。");
  }

  if (path === "international") {
    actions.push("进一步明确国际学校预期层级，避免预算和目标错配。");
  }

  if (path === "local") {
    actions.push("尽快核对身份、时间窗口与可接受的通勤/陪读安排。");
  }

  if (riskTags.includes("身份因素复杂")) {
    actions.push("把身份规划单独拎出来评估，避免影响择校节奏。");
  }

  actions.push("预约真人顾问进行 1v1 细化判断，确认优先动作顺序。");

  return actions.slice(0, 4);
}

export function calculateScores(answers) {
  const urgency = scoreMaps.urgency[answers.timeline] ?? 1;
  const budget = scoreMaps.budget[answers.budget] ?? 1;
  const intent = scoreMaps.intent[answers.consultationIntent] ?? 1;
  const complexity = complexityScore(answers);
  const composite = Number((0.35 * intent + 0.25 * urgency + 0.2 * budget + 0.2 * complexity).toFixed(2));

  let grade = "C";
  let priority = "低";

  if (composite >= 4.3) {
    grade = "S";
    priority = "高";
  } else if (composite >= 3.5) {
    grade = "A";
    priority = "高";
  } else if (composite >= 2.6) {
    grade = "B";
    priority = "中";
  }

  return { urgency, budget, intent, complexity, composite, grade, priority };
}

export function generateResult(answers) {
  return buildLegacyResult(normalizeInputAnswers(answers));
}

export function recommendConsultant(result, consultants, leads = []) {
  const openStatuses = new Set(["待派单", "已派单", "顾问已接收", "跟进中"]);
  const activeCounts = leads.reduce((acc, lead) => {
    if (!lead.assignedConsultantId || !openStatuses.has(lead.status)) {
      return acc;
    }

    acc[lead.assignedConsultantId] = (acc[lead.assignedConsultantId] ?? 0) + 1;
    return acc;
  }, {});

  const specialtyNeed =
    result.consultantType === "特殊案例顾问"
      ? "complex"
      : result.primaryPath === "international"
        ? "international"
        : result.primaryPath === "local"
          ? "local"
          : "conversion";

  const ranked = consultants
    .map((consultant) => {
      const specialtyMatch = consultant.specialties.includes(specialtyNeed) ? 2 : 0;
      const secondaryMatch =
        result.scores.priority === "高" && consultant.specialties.includes("conversion") ? 1 : 0;
      const load = activeCounts[consultant.id] ?? 0;

      return {
        ...consultant,
        matchScore: specialtyMatch + secondaryMatch - load * 0.1,
        activeLoad: load
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore || a.activeLoad - b.activeLoad);

  const chosen = ranked[0];

  return {
    consultantId: chosen?.id ?? null,
    consultantName: chosen?.name ?? "待确认",
    reason:
      chosen == null
        ? "当前顾问池为空，建议管理员手动分配。"
        : `匹配方向：${chosen.focusLabel}；当前开放线索 ${chosen.activeLoad} 条，优先级适合承接该案例。`,
    pool: ranked.slice(0, 3).map((item) => ({
      id: item.id,
      name: item.name,
      focusLabel: item.focusLabel,
      activeLoad: item.activeLoad
    }))
  };
}

export function formatAnswerSummary(answers) {
  return Object.entries(answers)
    .filter(([, value]) => (Array.isArray(value) ? value.length > 0 : Boolean(value)))
    .map(([key, value]) => ({
      label: getFieldLabel(key),
      value:
        typeof value === "string" && value.length < 40
          ? getOptionLabel(key, value)
          : Array.isArray(value)
            ? getOptionLabel(key, value)
            : value
    }));
}
