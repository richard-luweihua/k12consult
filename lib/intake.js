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
    .filter(([, value]) => value)
    .map(([key, value]) => ({
      label: getFieldLabel(key),
      value: typeof value === "string" && value.length < 40 ? getOptionLabel(key, value) : value
    }));
}
