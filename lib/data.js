import { promises as fs } from "fs";
import path from "path";
import { defaultConsultants, defaultDbTemplate } from "./consultants.js";
import { buildV2LeadArtifacts, recommendConsultant } from "./intake.js";
import { notifyLeadCreated, notifyLeadUpdated } from "./notifications.js";
import { getSupabaseAdmin, hasSupabaseConfig } from "./supabase.js";
import { getChannelLabel, normalizeLeadPayload } from "./tracking.js";

const dbPath = path.join(process.cwd(), "data", "db.json");
const v2StatusAliasMap = {
  report_view_pending: "report_viewed",
  submitted_pending_review: "consult_intent_submitted",
  consulting: "follow_up",
  converted: "consult_completed"
};

function normalizeV2Status(status) {
  if (typeof status !== "string") {
    return status;
  }

  const trimmed = status.trim();

  if (!trimmed) {
    return trimmed;
  }

  return v2StatusAliasMap[trimmed] || trimmed;
}

function normalizeStatusRecord(record) {
  if (!record || typeof record !== "object") {
    return record;
  }

  const normalizedStatus = normalizeV2Status(record.status);

  if (!normalizedStatus || normalizedStatus === record.status) {
    return record;
  }

  return {
    ...record,
    status: normalizedStatus
  };
}

let forcedStorageMode = null;

function getStorageMode() {
  if (forcedStorageMode) {
    return forcedStorageMode;
  }

  return hasSupabaseConfig() ? "supabase" : "file";
}

function annotateLead(lead) {
  if (!lead) {
    return null;
  }

  const effectiveChannel = lead.effectiveChannel || lead.tracking?.effectiveChannel || lead.answers?.sourceChannel || "direct";

  return {
    ...lead,
    caseRecord: normalizeStatusRecord(lead.caseRecord),
    adminFollowUpRecord: normalizeStatusRecord(lead.adminFollowUpRecord),
    sourceChannel: lead.sourceChannel || lead.answers?.sourceChannel || "",
    effectiveChannel,
    channelLabel: getChannelLabel(effectiveChannel),
    tracking: {
      effectiveChannel,
      utmSource: lead.utmSource || lead.tracking?.utmSource || "",
      utmMedium: lead.utmMedium || lead.tracking?.utmMedium || "",
      utmCampaign: lead.utmCampaign || lead.tracking?.utmCampaign || "",
      utmContent: lead.utmContent || lead.tracking?.utmContent || "",
      entryPath: lead.entryPath || lead.tracking?.entryPath || "",
      landingUrl: lead.landingUrl || lead.tracking?.landingUrl || "",
      referrer: lead.referrer || lead.tracking?.referrer || ""
    }
  };
}

async function ensureDb() {
  try {
    await fs.access(dbPath);
  } catch {
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(defaultDbTemplate, null, 2), "utf8");
  }
}

export async function readDb() {
  await ensureDb();
  const content = await fs.readFile(dbPath, "utf8");
  const parsed = JSON.parse(content);

  return {
    ...defaultDbTemplate,
    ...parsed,
    consultants: parsed.consultants ?? defaultDbTemplate.consultants,
    leads: parsed.leads ?? [],
    students: parsed.students ?? [],
    cases: parsed.cases ?? [],
    questionnaireResponses: parsed.questionnaireResponses ?? [],
    diagnosticJobs: parsed.diagnosticJobs ?? [],
    diagnosticResults: parsed.diagnosticResults ?? [],
    reports: parsed.reports ?? []
  };
}

export async function writeDb(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf8");
}

async function ensureSupabaseConsultants(supabase) {
  const { data, error } = await supabase.from("consultants").select("id").limit(1);

  if (error) {
    throw error;
  }

  if (data.length === 0) {
    const { error: insertError } = await supabase.from("consultants").insert(
      defaultConsultants.map((consultant) => ({
        id: consultant.id,
        name: consultant.name,
        title: consultant.title,
        focus_label: consultant.focusLabel,
        specialties: consultant.specialties
      }))
    );

    if (insertError) {
      throw insertError;
    }
  }
}

function normalizeConsultantRow(row) {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    focusLabel: row.focus_label,
    specialties: row.specialties ?? []
  };
}

function normalizeLeadRow(row, followUps = []) {
  const result = row.result ?? {};

  return annotateLead({
    id: row.id,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    userId: row.user_id ?? row.answers?.userId ?? null,
    user_id: row.user_id ?? row.answers?.userId ?? null,
    status: row.status,
    assignedConsultantId: row.assigned_consultant_id,
    assigned_consultant_id: row.assigned_consultant_id,
    sourceChannel: row.source_channel,
    effectiveChannel: row.effective_channel,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    entryPath: row.entry_path,
    landingUrl: row.landing_url,
    referrer: row.referrer,
    priority: row.priority ?? result.scores?.priority ?? null,
    grade: row.grade ?? result.scores?.grade ?? null,
    assignment: row.assignment,
    answers: row.answers,
    result,
    student: row.student ?? result.student ?? null,
    caseRecord: row.case_record ?? row.caseRecord ?? result.caseRecord ?? null,
    questionnaireResponse:
      row.questionnaire_response ?? row.questionnaireResponse ?? result.questionnaireResponse ?? null,
    diagnosticJob: row.diagnostic_job ?? row.diagnosticJob ?? result.diagnosticJob ?? null,
    diagnosticResult: row.diagnostic_result ?? row.diagnosticResult ?? result.diagnosticResult ?? null,
    currentReport: row.current_report ?? row.currentReport ?? result.currentReport ?? null,
    reportVersions: row.report_versions ?? row.reportVersions ?? result.reportVersions ?? [],
    consultationRequest:
      row.consultation_request ?? row.consultationRequest ?? result.consultationRequest ?? null,
    adminFollowUpRecord:
      row.admin_follow_up_record ?? row.adminFollowUpRecord ?? result.adminFollowUpRecord ?? null,
    followUps: followUps.map((item) => ({
      id: item.id,
      createdAt: item.created_at,
      author: item.author,
      note: item.note
    }))
  });
}

const v2StatusToLegacyStatus = {
  report_viewed: "待派单",
  report_view_pending: "待派单",
  submitted_pending_review: "待派单",
  consult_intent_submitted: "待派单",
  admin_following: "跟进中",
  awaiting_user_info: "跟进中",
  consult_ready_for_assignment: "待派单",
  nurturing: "暂不跟进",
  consult_assigned: "已派单",
  consult_scheduled: "顾问已接收",
  consult_completed: "已转化",
  follow_up: "跟进中",
  closed: "已关闭",
  consulting: "跟进中",
  converted: "已转化"
};
const allowedV2Transitions = {
  report_viewed: ["consult_intent_submitted", "admin_following", "nurturing", "closed"],
  consult_intent_submitted: ["admin_following", "nurturing", "closed"],
  admin_following: ["awaiting_user_info", "consult_ready_for_assignment", "nurturing", "closed"],
  awaiting_user_info: ["admin_following", "consult_ready_for_assignment", "nurturing", "closed"],
  consult_ready_for_assignment: ["consult_assigned", "nurturing", "closed"],
  consult_assigned: ["consult_scheduled", "closed"],
  consult_scheduled: ["consult_completed", "closed"],
  consult_completed: ["follow_up", "closed"],
  follow_up: ["closed"],
  nurturing: ["admin_following", "consult_ready_for_assignment", "closed"],
  closed: ["admin_following"]
};

function resolveV2StatusFromLegacyStatus(legacyStatus) {
  if (legacyStatus === "已关闭") {
    return "closed";
  }

  if (legacyStatus === "暂不跟进") {
    return "nurturing";
  }

  if (legacyStatus === "已转化") {
    return "consult_completed";
  }

  if (legacyStatus === "顾问已接收") {
    return "consult_scheduled";
  }

  if (legacyStatus === "已派单") {
    return "consult_assigned";
  }

  if (legacyStatus === "跟进中") {
    return "admin_following";
  }

  return "report_viewed";
}

function resolveCurrentV2Status(lead) {
  const embeddedStatus = normalizeV2Status(lead.caseRecord?.status || lead.adminFollowUpRecord?.status || "");

  if (embeddedStatus) {
    return embeddedStatus;
  }

  return resolveV2StatusFromLegacyStatus(lead.status);
}

function ensureV2TransitionAllowed(currentStatus, nextStatus) {
  if (!nextStatus || !currentStatus || nextStatus === currentStatus) {
    return;
  }

  const allowed = allowedV2Transitions[currentStatus];

  if (!allowed || allowed.includes(nextStatus)) {
    return;
  }

  throw new Error(`不支持的状态流转：${currentStatus} -> ${nextStatus}`);
}

function resolveStatusUpdate(payload) {
  const requestedV2Status =
    typeof payload.v2Status === "string" && payload.v2Status.trim().length > 0
      ? normalizeV2Status(payload.v2Status.trim())
      : null;
  const requestedLegacyStatus =
    typeof payload.status === "string" && payload.status.trim().length > 0 ? payload.status.trim() : null;
  const mappedLegacyStatus = requestedV2Status ? v2StatusToLegacyStatus[requestedV2Status] ?? null : null;

  return {
    requestedV2Status,
    nextLegacyStatus: requestedLegacyStatus || mappedLegacyStatus
  };
}

function resolveRequestedV2Status(currentV2Status, payload, requestedV2Status) {
  if (requestedV2Status) {
    return requestedV2Status;
  }

  if (payload.submitConsultationIntent && currentV2Status === "report_viewed") {
    return "consult_intent_submitted";
  }

  if (payload.submitSupplementalInfo && currentV2Status === "awaiting_user_info") {
    return "admin_following";
  }

  return null;
}

function resolveArrayValue(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return null;
}

function buildAdminFollowUpPatch(payload, existingRecord, nowIso) {
  const patch = {};
  const existingFollowUpRecord = existingRecord || {};

  if (typeof payload.intentLevel === "string" && payload.intentLevel.trim()) {
    patch.intentLevel = payload.intentLevel.trim();
  }

  if (typeof payload.targetTimeline === "string" && payload.targetTimeline.trim()) {
    patch.targetTimeline = payload.targetTimeline.trim();
  }

  if (typeof payload.budgetLevel === "string" && payload.budgetLevel.trim()) {
    patch.budgetLevel = payload.budgetLevel.trim();
  }

  const consultFocus = resolveArrayValue(payload.consultFocus);
  if (consultFocus) {
    patch.consultFocus = consultFocus;
  }

  const missingInfo = resolveArrayValue(payload.missingInfo);
  if (missingInfo) {
    patch.missingInfo = missingInfo;
  }

  const supplementalInfoProvided = resolveArrayValue(payload.supplementalInfoProvided);
  const hasSupplementalNotes = typeof payload.supplementalInfoNotes === "string";

  if (supplementalInfoProvided || hasSupplementalNotes) {
    const existingMissingInfo = Array.isArray(existingFollowUpRecord.missingInfo)
      ? existingFollowUpRecord.missingInfo.filter(Boolean)
      : [];

    if (supplementalInfoProvided) {
      patch.missingInfo = existingMissingInfo.filter((item) => !supplementalInfoProvided.includes(item));
    }

    patch.userSupplement = {
      providedItems: supplementalInfoProvided || existingFollowUpRecord.userSupplement?.providedItems || [],
      notes: hasSupplementalNotes
        ? payload.supplementalInfoNotes.trim()
        : existingFollowUpRecord.userSupplement?.notes || "",
      submittedAt: nowIso
    };
  }

  if (typeof payload.handoffSummary === "string") {
    patch.handoffSummary = payload.handoffSummary.trim();
  }

  if (typeof payload.adminInternalNotes === "string") {
    patch.adminInternalNotes = payload.adminInternalNotes.trim();
  }

  if (typeof payload.slaStatus === "string" && payload.slaStatus.trim()) {
    patch.slaStatus = payload.slaStatus.trim();
  }

  if (typeof payload.firstContactAt === "string" && payload.firstContactAt.trim()) {
    patch.firstContactAt = payload.firstContactAt.trim();
  }

  if (payload.markQualified) {
    patch.qualifiedAt = nowIso;
  }

  if (Object.keys(patch).length === 0) {
    return null;
  }

  return {
    ...(existingRecord || {}),
    ...patch,
    updatedAt: nowIso
  };
}

function buildConsultationRequestPatch(payload, existingRecord, nowIso) {
  const patch = {};

  if (typeof payload.consultationRequestStatus === "string" && payload.consultationRequestStatus.trim()) {
    patch.requestStatus = payload.consultationRequestStatus.trim();
  }

  if (typeof payload.consultationContactTimePreference === "string") {
    patch.contactTimePreference = payload.consultationContactTimePreference.trim();
  }

  if (typeof payload.consultationNotes === "string") {
    patch.notes = payload.consultationNotes.trim();
  }

  if (typeof payload.consultationSubmittedAt === "string" && payload.consultationSubmittedAt.trim()) {
    patch.submittedAt = payload.consultationSubmittedAt.trim();
  }

  if (payload.submitConsultationIntent) {
    patch.requestStatus = "submitted";
    patch.submittedAt = nowIso;
  }

  if (Object.keys(patch).length === 0) {
    return null;
  }

  return {
    ...(existingRecord || {}),
    ...patch
  };
}

function buildCaseRecordPatch(payload, existingRecord, nowIso, requestedV2Status) {
  const patch = {};
  const summaryPatch = {};
  const baseRecord = existingRecord || {};
  const baseSummary = baseRecord.consultationSummary || {};
  const basePostConsultation = baseRecord.postConsultation || {};
  const baseClosure = baseRecord.closure || {};
  const postConsultationPatch = {};
  const closurePatch = {};

  if (typeof payload.consultationScheduledAt === "string" && payload.consultationScheduledAt.trim()) {
    patch.consultationScheduledAt = payload.consultationScheduledAt.trim();
  }

  if (typeof payload.consultationFinalPath === "string" && payload.consultationFinalPath.trim()) {
    summaryPatch.finalPath = payload.consultationFinalPath.trim();
  }

  if (typeof payload.consultationSchoolBand === "string" && payload.consultationSchoolBand.trim()) {
    summaryPatch.schoolBand = payload.consultationSchoolBand.trim();
  }

  if (typeof payload.consultationRiskActions === "string") {
    summaryPatch.riskActions = payload.consultationRiskActions.trim();
  }

  if (typeof payload.consultationNextAction === "string") {
    summaryPatch.nextAction = payload.consultationNextAction.trim();
  }

  if (typeof payload.consultationSummaryNote === "string") {
    summaryPatch.consultantNote = payload.consultationSummaryNote.trim();
  }

  if (Object.keys(summaryPatch).length > 0) {
    patch.consultationSummary = {
      ...baseSummary,
      ...summaryPatch,
      updatedAt: nowIso
    };
  }

  if (requestedV2Status === "consult_scheduled" && !patch.consultationScheduledAt && !baseRecord.consultationScheduledAt) {
    patch.consultationScheduledAt = nowIso;
  }

  if (requestedV2Status === "consult_completed") {
    patch.consultationCompletedAt = nowIso;
  }

  if (typeof payload.followUpSummary === "string") {
    postConsultationPatch.summary = payload.followUpSummary.trim();
  }

  if (typeof payload.followUpNextStep === "string") {
    postConsultationPatch.nextStep = payload.followUpNextStep.trim();
  }

  if (typeof payload.followUpOwner === "string") {
    postConsultationPatch.owner = payload.followUpOwner.trim();
  }

  if (Object.keys(postConsultationPatch).length > 0) {
    patch.postConsultation = {
      ...basePostConsultation,
      ...postConsultationPatch,
      updatedAt: nowIso
    };
  }

  if (typeof payload.closeReason === "string" && payload.closeReason.trim()) {
    closurePatch.reason = payload.closeReason.trim();
  }

  if (typeof payload.closeNote === "string") {
    closurePatch.note = payload.closeNote.trim();
  }

  if (typeof payload.closeBy === "string" && payload.closeBy.trim()) {
    closurePatch.by = payload.closeBy.trim();
  }

  if (requestedV2Status === "closed") {
    closurePatch.closedAt = nowIso;
  }

  if (Object.keys(closurePatch).length > 0) {
    patch.closure = {
      ...baseClosure,
      ...closurePatch,
      updatedAt: nowIso
    };
  }

  if (Object.keys(patch).length === 0) {
    return null;
  }

  return {
    ...baseRecord,
    ...patch,
    updatedAt: nowIso
  };
}

function ensureConsultationSummaryOnCompletion(payload, currentCaseRecord, requestedV2Status) {
  if (requestedV2Status !== "consult_completed") {
    return;
  }

  const baseSummary = currentCaseRecord?.consultationSummary || {};
  const finalPath =
    (typeof payload.consultationFinalPath === "string" ? payload.consultationFinalPath.trim() : "") || baseSummary.finalPath;
  const nextAction =
    (typeof payload.consultationNextAction === "string" ? payload.consultationNextAction.trim() : "") || baseSummary.nextAction;

  if (!finalPath || !nextAction) {
    throw new Error("请先补全咨询结论中的“最终路径建议”和“3个月第一步动作”，再标记咨询完成。");
  }
}

function ensureCloseReasonOnClosure(payload, currentCaseRecord, requestedV2Status) {
  if (requestedV2Status !== "closed") {
    return;
  }

  const baseReason = currentCaseRecord?.closure?.reason || "";
  const nextReason = typeof payload.closeReason === "string" ? payload.closeReason.trim() : baseReason;

  if (!nextReason) {
    throw new Error("请先填写案例关闭原因，再标记关闭。");
  }
}

function buildCompatibleLeadRecord({ leadId, userId, answers, tracking, assignment, artifacts, now }) {
  const result = {
    ...artifacts.result,
    student: {
      name: answers.studentName,
      grade: answers.grade,
      location: answers.location
    },
    caseRecord: {
      status: artifacts.adminFollowUpRecord.status,
      assignedConsultantId: null,
      assignedConsultantName: "待确认",
      recommendedConsultantId: assignment.consultantId,
      recommendedConsultantName: assignment.consultantName,
      createdAt: now
    },
    questionnaireResponse: artifacts.questionnaireResponse,
    diagnosticJob: artifacts.diagnosticJob,
    diagnosticResult: artifacts.diagnosticResult,
    currentReport: artifacts.currentReport,
    reportVersions: [artifacts.currentReport],
    consultationRequest: artifacts.consultationRequest,
    adminFollowUpRecord: artifacts.adminFollowUpRecord
  };

  return annotateLead({
    id: leadId,
    createdAt: now,
    created_at: now,
    updatedAt: now,
    updated_at: now,
    userId,
    user_id: userId,
    status: "待派单",
    assignedConsultantId: null,
    assigned_consultant_id: null,
    sourceChannel: answers.sourceChannel,
    effectiveChannel: tracking.effectiveChannel,
    utmSource: tracking.utmSource,
    utmMedium: tracking.utmMedium,
    utmCampaign: tracking.utmCampaign,
    utmContent: tracking.utmContent,
    entryPath: tracking.entryPath,
    landingUrl: tracking.landingUrl,
    referrer: tracking.referrer,
    priority: result.scores.priority,
    grade: result.scores.grade,
    assignment,
    answers,
    result,
    student: result.student,
    caseRecord: result.caseRecord,
    questionnaireResponse: result.questionnaireResponse,
    diagnosticJob: result.diagnosticJob,
    diagnosticResult: result.diagnosticResult,
    currentReport: result.currentReport,
    reportVersions: result.reportVersions,
    consultationRequest: result.consultationRequest,
    adminFollowUpRecord: result.adminFollowUpRecord,
    followUps: [
      {
        id: crypto.randomUUID(),
        createdAt: now,
        author: "系统",
        note: `已完成前诊、规则判定和报告草稿生成，建议派给 ${assignment.consultantName}。`
      }
    ]
  });
}

async function createLeadInFile(payload) {
  const db = await readDb();
  const { answers, tracking } = normalizeLeadPayload(payload);
  const leadId = crypto.randomUUID();
  const now = new Date().toISOString();
  const artifacts = buildV2LeadArtifacts(answers, {
    nowIso: now,
    tracking
  });
  const normalizedAnswers = artifacts.normalizedAnswers;
  const assignment = recommendConsultant(artifacts.result, db.consultants, db.leads);

  const lead = buildCompatibleLeadRecord({
    leadId,
    userId: payload.userId ?? null,
    answers: normalizedAnswers,
    tracking,
    assignment,
    artifacts,
    now
  });

  db.leads.unshift(lead);
  db.students.unshift({
    id: crypto.randomUUID(),
    userId: payload.userId ?? null,
    leadId,
    name: normalizedAnswers.studentName,
    currentGrade: normalizedAnswers.grade,
    currentCity: normalizedAnswers.location,
    createdAt: now,
    updatedAt: now
  });
  db.cases.unshift({
    id: crypto.randomUUID(),
    leadId,
    userId: payload.userId ?? null,
    status: lead.caseRecord?.status ?? "report_viewed",
    assignedConsultantId: null,
    createdAt: now,
    updatedAt: now
  });
  db.questionnaireResponses.unshift({
    id: crypto.randomUUID(),
    leadId,
    ...artifacts.questionnaireResponse
  });
  db.diagnosticJobs.unshift({
    id: crypto.randomUUID(),
    leadId,
    ...artifacts.diagnosticJob
  });
  db.diagnosticResults.unshift({
    id: crypto.randomUUID(),
    leadId,
    ...artifacts.diagnosticResult
  });
  db.reports.unshift({
    id: crypto.randomUUID(),
    leadId,
    ...artifacts.currentReport
  });
  await writeDb(db);
  await notifyLeadCreated(lead);

  return lead;
}

async function listLeadsFromFile() {
  const db = await readDb();
  return {
    consultants: db.consultants,
    leads: db.leads.map(annotateLead),
    storageMode: "file"
  };
}

async function getLeadFromFile(leadId) {
  const db = await readDb();
  return {
    consultants: db.consultants,
    lead: annotateLead(db.leads.find((item) => item.id === leadId) ?? null),
    storageMode: "file"
  };
}

async function updateLeadInFile(leadId, payload) {
  const db = await readDb();
  const leadIndex = db.leads.findIndex((item) => item.id === leadId);

  if (leadIndex === -1) {
    return null;
  }

  const currentLead = db.leads[leadIndex];
  const previousStatus = currentLead.status;
  const statusUpdate = resolveStatusUpdate(payload);
  const currentV2Status = resolveCurrentV2Status(currentLead);
  const requestedV2Status = resolveRequestedV2Status(currentV2Status, payload, statusUpdate.requestedV2Status);
  const nextLegacyStatus = statusUpdate.nextLegacyStatus || (requestedV2Status ? v2StatusToLegacyStatus[requestedV2Status] : null);
  ensureConsultationSummaryOnCompletion(payload, currentLead.caseRecord, requestedV2Status);
  ensureCloseReasonOnClosure(payload, currentLead.caseRecord, requestedV2Status);
  ensureV2TransitionAllowed(currentV2Status, requestedV2Status);
  const nowIso = new Date().toISOString();
  const nextLead = {
    ...currentLead,
    updatedAt: nowIso
  };

  if (nextLegacyStatus) {
    nextLead.status = nextLegacyStatus;
  }

  if (requestedV2Status) {
    nextLead.caseRecord = {
      ...(nextLead.caseRecord || {}),
      status: requestedV2Status,
      updatedAt: nextLead.updatedAt
    };
    nextLead.adminFollowUpRecord = {
      ...(nextLead.adminFollowUpRecord || {}),
      status: requestedV2Status,
      updatedAt: nextLead.updatedAt
    };
  }

  if (payload.assignedConsultantId !== undefined) {
    nextLead.assignedConsultantId = payload.assignedConsultantId || null;

    const consultant = db.consultants.find((item) => item.id === payload.assignedConsultantId);

    nextLead.assignment = {
      ...nextLead.assignment,
      consultantId: consultant?.id ?? null,
      consultantName: consultant?.name ?? "待确认",
      reason: consultant
        ? `管理员手动改派至 ${consultant.name}，顾问方向：${consultant.focusLabel}。`
        : "已取消顾问分配，等待后续处理。"
    };
    nextLead.caseRecord = {
      ...(nextLead.caseRecord || {}),
      assignedConsultantId: consultant?.id ?? null,
      assignedConsultantName: consultant?.name ?? "待确认",
      updatedAt: nextLead.updatedAt
    };
  }

  const caseRecordPatch = buildCaseRecordPatch(payload, nextLead.caseRecord, nowIso, requestedV2Status);

  if (caseRecordPatch) {
    nextLead.caseRecord = caseRecordPatch;
  }

  if (payload.followUpNote) {
    nextLead.followUps = [
      {
        id: crypto.randomUUID(),
        createdAt: nowIso,
        author: payload.followUpAuthor || "顾问",
        note: payload.followUpNote
      },
      ...currentLead.followUps
    ];

    nextLead.adminFollowUpRecord = {
      ...(nextLead.adminFollowUpRecord || {}),
      followUpNotes: [
        {
          createdAt: nowIso,
          author: payload.followUpAuthor || "顾问",
          note: payload.followUpNote
        },
        ...((nextLead.adminFollowUpRecord?.followUpNotes || []).slice(0, 49))
      ],
      updatedAt: nowIso
    };
  }

  const adminFollowUpPatch = buildAdminFollowUpPatch(payload, nextLead.adminFollowUpRecord, nowIso);

  if (adminFollowUpPatch) {
    nextLead.adminFollowUpRecord = adminFollowUpPatch;
  }

  const consultationRequestPatch = buildConsultationRequestPatch(payload, nextLead.consultationRequest, nowIso);

  if (consultationRequestPatch) {
    nextLead.consultationRequest = consultationRequestPatch;
  }

  db.leads[leadIndex] = nextLead;
  await writeDb(db);
  const annotatedLead = {
    ...annotateLead(nextLead),
    previousStatus
  };
  const notifyPayload = nextLegacyStatus && !payload.status ? { ...payload, status: nextLegacyStatus } : payload;
  await notifyLeadUpdated(annotatedLead, notifyPayload);

  return annotatedLead;
}

async function createLeadInSupabase(payload) {
  const supabase = getSupabaseAdmin();
  await ensureSupabaseConsultants(supabase);

  const { answers, tracking } = normalizeLeadPayload(payload);
  const leadId = crypto.randomUUID();
  const { data: consultantsData, error: consultantsError } = await supabase.from("consultants").select("*");

  if (consultantsError) {
    throw consultantsError;
  }

  const consultants = consultantsData.map(normalizeConsultantRow);
  const { data: activeLeadRows, error: activeLeadError } = await supabase
    .from("leads")
    .select("id, status, assigned_consultant_id")
    .in("status", ["待派单", "已派单", "顾问已接收", "跟进中"]);

  if (activeLeadError) {
    throw activeLeadError;
  }

  const now = new Date().toISOString();
  const artifacts = buildV2LeadArtifacts(answers, {
    nowIso: now,
    tracking
  });
  const normalizedAnswers = artifacts.normalizedAnswers;
  const assignment = recommendConsultant(
    artifacts.result,
    consultants,
    activeLeadRows.map((row) => ({
      id: row.id,
      status: row.status,
      assignedConsultantId: row.assigned_consultant_id
    }))
  );
  const lead = buildCompatibleLeadRecord({
    leadId,
    userId: payload.userId ?? null,
    answers: normalizedAnswers,
    tracking,
    assignment,
    artifacts,
    now
  });

  const row = {
    id: leadId,
    created_at: now,
    updated_at: now,
    user_id: payload.userId,
    status: "待派单",
    assigned_consultant_id: null,
    source_channel: normalizedAnswers.sourceChannel,
    effective_channel: tracking.effectiveChannel,
    utm_source: tracking.utmSource,
    utm_medium: tracking.utmMedium,
    utm_campaign: tracking.utmCampaign,
    utm_content: tracking.utmContent,
    entry_path: tracking.entryPath,
    landing_url: tracking.landingUrl,
    referrer: tracking.referrer,
    priority: lead.result.scores.priority,
    grade: lead.result.scores.grade,
    answers: normalizedAnswers,
    result: lead.result,
    assignment,
    student: lead.student,
    case_record: lead.caseRecord,
    questionnaire_response: lead.questionnaireResponse,
    diagnostic_job: lead.diagnosticJob,
    diagnostic_result: lead.diagnosticResult,
    current_report: lead.currentReport,
    report_versions: lead.reportVersions,
    consultation_request: lead.consultationRequest,
    admin_follow_up_record: lead.adminFollowUpRecord
  };

  const legacyRow = {
    id: leadId,
    created_at: now,
    updated_at: now,
    user_id: payload.userId,
    status: "待派单",
    assigned_consultant_id: null,
    source_channel: normalizedAnswers.sourceChannel,
    effective_channel: tracking.effectiveChannel,
    utm_source: tracking.utmSource,
    utm_medium: tracking.utmMedium,
    utm_campaign: tracking.utmCampaign,
    utm_content: tracking.utmContent,
    entry_path: tracking.entryPath,
    landing_url: tracking.landingUrl,
    referrer: tracking.referrer,
    priority: lead.result.scores.priority,
    grade: lead.result.scores.grade,
    answers: normalizedAnswers,
    result: lead.result,
    assignment
  };

  let insertedLead;
  let insertLeadError;

  ({ data: insertedLead, error: insertLeadError } = await supabase.from("leads").insert(row).select("*").single());

  if (insertLeadError) {
    const fallbackRow = { ...legacyRow };

    if (insertLeadError?.message?.includes("user_id")) {
      delete fallbackRow.user_id;
    }

    ({ data: insertedLead, error: insertLeadError } = await supabase
      .from("leads")
      .insert(fallbackRow)
      .select("*")
      .single());
  }

  if (insertLeadError) {
    throw insertLeadError;
  }

  const firstFollowUp = {
    id: crypto.randomUUID(),
    lead_id: leadId,
    created_at: now,
    author: "系统",
    note: `已完成前诊、规则判定和报告草稿生成，建议派给 ${assignment.consultantName}。`
  };

  const { data: insertedFollowUp, error: insertFollowUpError } = await supabase
    .from("follow_ups")
    .insert(firstFollowUp)
    .select("*")
    .single();

  if (insertFollowUpError) {
    throw insertFollowUpError;
  }

  const normalizedLead = normalizeLeadRow(insertedLead, [insertedFollowUp]);
  await notifyLeadCreated(normalizedLead);
  return normalizedLead;
}

async function listLeadsFromSupabase() {
  const supabase = getSupabaseAdmin();
  await ensureSupabaseConsultants(supabase);

  const [{ data: consultantsData, error: consultantsError }, { data: leadRows, error: leadsError }] = await Promise.all([
    supabase.from("consultants").select("*").order("name"),
    supabase.from("leads").select("*").order("created_at", { ascending: false })
  ]);

  if (consultantsError) {
    throw consultantsError;
  }

  if (leadsError) {
    throw leadsError;
  }

  const leadIds = leadRows.map((row) => row.id);
  let followUps = [];

  if (leadIds.length > 0) {
    const { data: followUpRows, error: followUpsError } = await supabase
      .from("follow_ups")
      .select("*")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false });

    if (followUpsError) {
      throw followUpsError;
    }

    followUps = followUpRows;
  }

  const followUpMap = followUps.reduce((acc, item) => {
    if (!acc.has(item.lead_id)) {
      acc.set(item.lead_id, []);
    }

    acc.get(item.lead_id).push(item);
    return acc;
  }, new Map());

  return {
    consultants: consultantsData.map(normalizeConsultantRow),
    leads: leadRows.map((row) => normalizeLeadRow(row, followUpMap.get(row.id) ?? [])),
    storageMode: "supabase"
  };
}

async function getLeadFromSupabase(leadId) {
  const supabase = getSupabaseAdmin();
  await ensureSupabaseConsultants(supabase);

  const [{ data: consultantsData, error: consultantsError }, { data: leadRow, error: leadError }] = await Promise.all([
    supabase.from("consultants").select("*").order("name"),
    supabase.from("leads").select("*").eq("id", leadId).maybeSingle()
  ]);

  if (consultantsError) {
    throw consultantsError;
  }

  if (leadError) {
    throw leadError;
  }

  if (!leadRow) {
    return {
      consultants: consultantsData.map(normalizeConsultantRow),
      lead: null,
      storageMode: "supabase"
    };
  }

  const { data: followUpsData, error: followUpsError } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (followUpsError) {
    throw followUpsError;
  }

  return {
    consultants: consultantsData.map(normalizeConsultantRow),
    lead: normalizeLeadRow(leadRow, followUpsData),
    storageMode: "supabase"
  };
}

async function updateLeadInSupabase(leadId, payload) {
  const supabase = getSupabaseAdmin();
  const leadBundle = await getLeadFromSupabase(leadId);

  if (!leadBundle.lead) {
    return null;
  }

  const currentLead = leadBundle.lead;
  const statusUpdate = resolveStatusUpdate(payload);
  const currentV2Status = resolveCurrentV2Status(currentLead);
  const requestedV2Status = resolveRequestedV2Status(currentV2Status, payload, statusUpdate.requestedV2Status);
  const nextLegacyStatus = statusUpdate.nextLegacyStatus || (requestedV2Status ? v2StatusToLegacyStatus[requestedV2Status] : null);
  ensureConsultationSummaryOnCompletion(payload, currentLead.caseRecord, requestedV2Status);
  ensureCloseReasonOnClosure(payload, currentLead.caseRecord, requestedV2Status);
  ensureV2TransitionAllowed(currentV2Status, requestedV2Status);
  const nowIso = new Date().toISOString();
  const updates = {
    updated_at: nowIso
  };

  if (nextLegacyStatus) {
    updates.status = nextLegacyStatus;
  }

  if (requestedV2Status) {
    updates.case_record = {
      ...(currentLead.caseRecord || {}),
      status: requestedV2Status,
      updatedAt: updates.updated_at
    };
    updates.admin_follow_up_record = {
      ...(currentLead.adminFollowUpRecord || {}),
      status: requestedV2Status,
      updatedAt: updates.updated_at
    };
  }

  if (payload.assignedConsultantId !== undefined) {
    updates.assigned_consultant_id = payload.assignedConsultantId || null;

    const consultant = leadBundle.consultants.find((item) => item.id === payload.assignedConsultantId);

    updates.assignment = {
      ...currentLead.assignment,
      consultantId: consultant?.id ?? null,
      consultantName: consultant?.name ?? "待确认",
      reason: consultant
        ? `管理员手动改派至 ${consultant.name}，顾问方向：${consultant.focusLabel}。`
        : "已取消顾问分配，等待后续处理。"
    };
    updates.case_record = {
      ...(currentLead.caseRecord || {}),
      assignedConsultantId: consultant?.id ?? null,
      assignedConsultantName: consultant?.name ?? "待确认",
      updatedAt: updates.updated_at
    };
  }

  const caseRecordPatch = buildCaseRecordPatch(
    payload,
    updates.case_record || currentLead.caseRecord,
    nowIso,
    requestedV2Status
  );

  if (caseRecordPatch) {
    updates.case_record = caseRecordPatch;
  }

  const adminFollowUpPatch = buildAdminFollowUpPatch(payload, currentLead.adminFollowUpRecord, nowIso);

  if (adminFollowUpPatch) {
    updates.admin_follow_up_record = adminFollowUpPatch;
  }

  const consultationRequestPatch = buildConsultationRequestPatch(payload, currentLead.consultationRequest, nowIso);

  if (consultationRequestPatch) {
    updates.consultation_request = consultationRequestPatch;
  }

  if (payload.followUpNote) {
    const baseAdminRecord = updates.admin_follow_up_record || currentLead.adminFollowUpRecord || {};
    updates.admin_follow_up_record = {
      ...baseAdminRecord,
      followUpNotes: [
        {
          createdAt: nowIso,
          author: payload.followUpAuthor || "顾问",
          note: payload.followUpNote
        },
        ...((baseAdminRecord.followUpNotes || []).slice(0, 49))
      ],
      updatedAt: nowIso
    };
  }

  let updatedRow;
  let updateError;

  ({ data: updatedRow, error: updateError } = await supabase.from("leads").update(updates).eq("id", leadId).select("*").single());

  if (updateError) {
    const legacyUpdates = { ...updates };
    delete legacyUpdates.case_record;
    delete legacyUpdates.admin_follow_up_record;
    delete legacyUpdates.consultation_request;

    ({ data: updatedRow, error: updateError } = await supabase
      .from("leads")
      .update(legacyUpdates)
      .eq("id", leadId)
      .select("*")
      .single());
  }

  if (updateError) {
    throw updateError;
  }

  if (payload.followUpNote) {

    const { error: followUpError } = await supabase.from("follow_ups").insert({
      id: crypto.randomUUID(),
      lead_id: leadId,
      created_at: nowIso,
      author: payload.followUpAuthor || "顾问",
      note: payload.followUpNote
    });

    if (followUpError) {
      throw followUpError;
    }
  }

  const refreshed = await getLeadFromSupabase(leadId);
  const updatedLead = {
    ...refreshed.lead,
    previousStatus: currentLead.status
  };
  const notifyPayload = nextLegacyStatus && !payload.status ? { ...payload, status: nextLegacyStatus } : payload;
  await notifyLeadUpdated(updatedLead, notifyPayload);
  return updatedLead;
}

async function withStorageFallback(supabaseHandler, fileHandler) {
  if (getStorageMode() !== "supabase") {
    return fileHandler();
  }

  try {
    return await supabaseHandler();
  } catch (error) {
    forcedStorageMode = "file";
    console.error("[storage] supabase failed, fallback to file storage", error);
    return fileHandler();
  }
}

function mergeLeadBundles(supabaseBundle, fileBundle) {
  const supabaseLeads = Array.isArray(supabaseBundle?.leads) ? supabaseBundle.leads : [];
  const fileLeads = Array.isArray(fileBundle?.leads) ? fileBundle.leads : [];
  const supabaseLeadIds = new Set(supabaseLeads.map((lead) => lead.id));
  const fileOnlyLeads = fileLeads.filter((lead) => !supabaseLeadIds.has(lead.id));

  if (fileOnlyLeads.length === 0) {
    return supabaseBundle;
  }

  const consultantMap = new Map();

  for (const consultant of Array.isArray(supabaseBundle?.consultants) ? supabaseBundle.consultants : []) {
    consultantMap.set(consultant.id, consultant);
  }

  for (const consultant of Array.isArray(fileBundle?.consultants) ? fileBundle.consultants : []) {
    if (!consultantMap.has(consultant.id)) {
      consultantMap.set(consultant.id, consultant);
    }
  }

  const mergedLeads = [...supabaseLeads, ...fileOnlyLeads].sort((a, b) => {
    const left = new Date(a.createdAt || a.created_at || 0).getTime();
    const right = new Date(b.createdAt || b.created_at || 0).getTime();
    return right - left;
  });

  return {
    ...supabaseBundle,
    consultants: [...consultantMap.values()],
    leads: mergedLeads,
    storageMode: "hybrid"
  };
}

export async function createLead(payload) {
  return withStorageFallback(() => createLeadInSupabase(payload), () => createLeadInFile(payload));
}

export async function listLeads() {
  return withStorageFallback(
    async () => {
      const [supabaseBundle, fileBundle] = await Promise.all([listLeadsFromSupabase(), listLeadsFromFile()]);
      return mergeLeadBundles(supabaseBundle, fileBundle);
    },
    () => listLeadsFromFile()
  );
}

export async function listLeadsForUser(userId) {
  const { leads } = await listLeads();
  return leads.filter((lead) => lead.userId === userId || lead.user_id === userId || lead.answers?.userId === userId);
}

export async function listAssignedLeadsForConsultant(consultantId) {
  const { leads } = await listLeads();
  return leads.filter((lead) => lead.assignedConsultantId === consultantId || lead.assigned_consultant_id === consultantId);
}

export async function getLead(leadId) {
  return withStorageFallback(
    async () => {
      const supabaseBundle = await getLeadFromSupabase(leadId);

      if (supabaseBundle.lead) {
        return supabaseBundle;
      }

      const fileBundle = await getLeadFromFile(leadId);
      return fileBundle.lead ? fileBundle : supabaseBundle;
    },
    () => getLeadFromFile(leadId)
  );
}

export async function updateLead(leadId, payload) {
  return withStorageFallback(
    async () => {
      const updatedLead = await updateLeadInSupabase(leadId, payload);

      if (updatedLead) {
        return updatedLead;
      }

      return updateLeadInFile(leadId, payload);
    },
    () => updateLeadInFile(leadId, payload)
  );
}
