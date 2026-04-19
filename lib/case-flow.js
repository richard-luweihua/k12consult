export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

export const v2StatusAliasMap = {
  report_view_pending: "report_viewed",
  submitted_pending_review: "consult_intent_submitted",
  consulting: "follow_up",
  consult_scheduled: "follow_up",
  consult_completed: "follow_up",
  converted: "closed"
};

export function normalizeV2Status(status) {
  if (typeof status !== "string") {
    return status;
  }

  const trimmed = status.trim();

  if (!trimmed) {
    return trimmed;
  }

  return v2StatusAliasMap[trimmed] || trimmed;
}

export const v2StatusToLegacyStatus = {
  report_viewed: "待派单",
  report_view_pending: "待派单",
  submitted_pending_review: "待派单",
  consult_intent_submitted: "待派单",
  admin_following: "跟进中",
  awaiting_user_info: "跟进中",
  consult_ready_for_assignment: "待派单",
  nurturing: "暂不跟进",
  consult_assigned: "已派单",
  follow_up: "跟进中",
  closed: "已关闭",
  consulting: "跟进中",
  converted: "已关闭"
};

export const allowedV2Transitions = {
  report_viewed: ["consult_intent_submitted", "admin_following", "nurturing", "closed"],
  consult_intent_submitted: ["admin_following", "nurturing", "closed"],
  admin_following: ["awaiting_user_info", "consult_ready_for_assignment", "nurturing", "closed"],
  awaiting_user_info: ["admin_following", "consult_ready_for_assignment", "nurturing", "closed"],
  consult_ready_for_assignment: ["consult_assigned", "nurturing", "closed"],
  consult_assigned: ["follow_up"],
  follow_up: ["closed", "nurturing"],
  nurturing: ["admin_following", "consult_ready_for_assignment", "consult_assigned", "closed"],
  closed: ["admin_following"]
};

function normalizeLegacyStatus(status) {
  if (status === "已关闭") {
    return "closed";
  }

  if (status === "暂不跟进") {
    return "nurturing";
  }

  if (status === "已转化") {
    return "closed";
  }

  if (status === "顾问已接收") {
    return "follow_up";
  }

  if (status === "已派单") {
    return "consult_assigned";
  }

  if (status === "跟进中") {
    return "admin_following";
  }

  return "report_viewed";
}

export function resolveV2StatusFromLegacyStatus(legacyStatus) {
  return normalizeLegacyStatus(legacyStatus);
}

export function assertCaseTransitionAllowed(currentStatus, nextStatus) {
  if (!nextStatus || !currentStatus || nextStatus === currentStatus) {
    return;
  }

  const normalizedCurrent = normalizeV2Status(currentStatus);
  const normalizedNext = normalizeV2Status(nextStatus);
  const allowed = allowedV2Transitions[normalizedCurrent];

  if (!allowed || allowed.includes(normalizedNext)) {
    return;
  }

  throw new ValidationError(`不支持的状态流转：${normalizedCurrent} -> ${normalizedNext}`);
}

function readStringValue(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function isSystemOrAdminAuthor(author) {
  const normalizedAuthor = readStringValue(author).toLowerCase();

  if (!normalizedAuthor) {
    return false;
  }

  return (
    normalizedAuthor.includes("系统") ||
    normalizedAuthor.includes("system") ||
    normalizedAuthor.includes("管理员") ||
    normalizedAuthor.includes("admin")
  );
}

function hasValidAdvisorFollowUpRecord(records = []) {
  if (!Array.isArray(records)) {
    return false;
  }

  return records.some((record) => {
    const note = readStringValue(record?.note);

    if (!note) {
      return false;
    }

    const author = readStringValue(record?.author);

    if (!author) {
      return true;
    }

    return !isSystemOrAdminAuthor(author);
  });
}

export function assertCaseTransitionRequirements({ nextStatus, payload = {}, currentCaseRecord = {} }) {
  const normalizedNext = normalizeV2Status(nextStatus);

  if (!normalizedNext) {
    return;
  }

  if (normalizedNext === "closed") {
    const closeReason = readStringValue(payload.closeReason || currentCaseRecord?.closure?.reason);

    if (!closeReason) {
      throw new ValidationError("请先填写成交结论，再标记为已成交关闭。");
    }
  }

  if (normalizedNext === "consult_assigned") {
    const assignedConsultantId = payload.assignedConsultantId || currentCaseRecord?.assignedConsultantId || "";

    if (!readStringValue(String(assignedConsultantId))) {
      throw new ValidationError("进入已转顾问前，必须先指定顾问。");
    }
  }

  if (normalizedNext === "follow_up") {
    const hasNewFollowUpNote = readStringValue(payload.followUpNote);
    const existingFollowUps = Array.isArray(payload.existingFollowUps)
      ? payload.existingFollowUps
      : Array.isArray(currentCaseRecord?.existingFollowUps)
        ? currentCaseRecord.existingFollowUps
        : [];

    const hasExistingAdvisorFollowUp = hasValidAdvisorFollowUpRecord(existingFollowUps);

    if (!hasNewFollowUpNote && !hasExistingAdvisorFollowUp) {
      throw new ValidationError("进入跟进中前，至少需要 1 条顾问跟进记录。");
    }
  }

  if (normalizedNext === "nurturing") {
    const nurturingReason = readStringValue(payload.nurturingReason || currentCaseRecord?.nurturing?.reason);
    const nurturingNextAction = readStringValue(payload.nurturingNextAction || currentCaseRecord?.nurturing?.nextAction);

    if (!nurturingReason) {
      throw new ValidationError("请先填写未成交原因，再转入资源库。");
    }

    if (!nurturingNextAction) {
      throw new ValidationError("请先填写后续培育动作，再转入资源库。");
    }
  }
}

export const consultantAllowedV2Statuses = new Set(["consult_assigned", "follow_up", "closed", "nurturing"]);

export function transitionCaseStatus({
  currentStatus,
  nextStatus,
  payload = {},
  currentCaseRecord = {}
}) {
  const normalizedCurrent = normalizeV2Status(currentStatus || "") || "report_viewed";
  const normalizedNext = normalizeV2Status(nextStatus || "");

  if (!normalizedNext || normalizedCurrent === normalizedNext) {
    return {
      changed: false,
      currentStatus: normalizedCurrent,
      nextStatus: normalizedCurrent,
      nextLegacyStatus: v2StatusToLegacyStatus[normalizedCurrent] ?? null
    };
  }

  assertCaseTransitionAllowed(normalizedCurrent, normalizedNext);
  assertCaseTransitionRequirements({
    nextStatus: normalizedNext,
    payload,
    currentCaseRecord
  });

  if (normalizedCurrent === "closed" && normalizedNext === "admin_following") {
    const reopenReason = readStringValue(payload.reopenReason || currentCaseRecord?.reopen?.reason);

    if (!reopenReason) {
      throw new ValidationError("已关闭案例回退到跟进中前，请先填写重新激活原因。");
    }
  }

  return {
    changed: true,
    currentStatus: normalizedCurrent,
    nextStatus: normalizedNext,
    nextLegacyStatus: v2StatusToLegacyStatus[normalizedNext] ?? null
  };
}
