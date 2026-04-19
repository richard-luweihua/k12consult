import { promises as fs } from "fs";
import path from "path";
import { defaultConsultants, defaultDbTemplate } from "./consultants.js";
import {
  normalizeV2Status,
  resolveV2StatusFromLegacyStatus,
  transitionCaseStatus as resolveCaseStatusTransition,
  v2StatusToLegacyStatus
} from "./case-flow.js";
import { buildV2LeadArtifacts, recommendConsultant } from "./intake.js";
import { notifyLeadCreated, notifyLeadUpdated } from "./notifications.js";
import { getSupabaseAdmin, hasSupabaseConfig } from "./supabase.js";
import { getChannelLabel, normalizeLeadPayload } from "./tracking.js";

const dbPath = path.join(process.cwd(), "data", "db.json");

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

export function resolveCurrentV2Status(lead) {
  const embeddedStatus = normalizeV2Status(lead.caseRecord?.status || lead.adminFollowUpRecord?.status || "");

  if (embeddedStatus) {
    return embeddedStatus;
  }

  return resolveV2StatusFromLegacyStatus(lead.status);
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

  if (typeof payload.consultationMobile === "string") {
    patch.mobile = payload.consultationMobile.trim();
  }

  if (typeof payload.consultationWechatId === "string") {
    patch.wechatId = payload.consultationWechatId.trim();
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
  const baseNurturing = baseRecord.nurturing || {};
  const postConsultationPatch = {};
  const closurePatch = {};
  const nurturingPatch = {};

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

  if (requestedV2Status === "follow_up" && !patch.consultationScheduledAt && !baseRecord.consultationScheduledAt) {
    patch.consultationScheduledAt = nowIso;
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

  if (typeof payload.nurturingReason === "string") {
    nurturingPatch.reason = payload.nurturingReason.trim();
  }

  if (typeof payload.nurturingNextAction === "string") {
    nurturingPatch.nextAction = payload.nurturingNextAction.trim();
  }

  if (requestedV2Status === "nurturing") {
    nurturingPatch.nurturingAt = nowIso;
  }

  if (Object.keys(nurturingPatch).length > 0) {
    patch.nurturing = {
      ...baseNurturing,
      ...nurturingPatch,
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
  const existingFollowUps = Array.isArray(currentLead.followUps) ? currentLead.followUps : [];
  const requestedV2Status = resolveRequestedV2Status(currentV2Status, payload, statusUpdate.requestedV2Status);
  const transition = resolveCaseStatusTransition({
    currentStatus: currentV2Status,
    nextStatus: requestedV2Status,
    payload: {
      ...payload,
      existingFollowUps
    },
    currentCaseRecord: {
      ...(currentLead.caseRecord || {}),
      existingFollowUps
    }
  });
  const nextV2Status = transition.nextStatus;
  const nextLegacyStatus = statusUpdate.nextLegacyStatus || (transition.changed ? transition.nextLegacyStatus : null);
  const nowIso = new Date().toISOString();
  const nextLead = {
    ...currentLead,
    updatedAt: nowIso
  };

  if (nextLegacyStatus) {
    nextLead.status = nextLegacyStatus;
  }

  if (transition.changed) {
    nextLead.caseRecord = {
      ...(nextLead.caseRecord || {}),
      status: nextV2Status,
      updatedAt: nextLead.updatedAt
    };
    nextLead.adminFollowUpRecord = {
      ...(nextLead.adminFollowUpRecord || {}),
      status: nextV2Status,
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

  const caseRecordPatch = buildCaseRecordPatch(payload, nextLead.caseRecord, nowIso, nextV2Status);

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
  const existingFollowUps = Array.isArray(currentLead.followUps) ? currentLead.followUps : [];
  const requestedV2Status = resolveRequestedV2Status(currentV2Status, payload, statusUpdate.requestedV2Status);
  const transition = resolveCaseStatusTransition({
    currentStatus: currentV2Status,
    nextStatus: requestedV2Status,
    payload: {
      ...payload,
      existingFollowUps
    },
    currentCaseRecord: {
      ...(currentLead.caseRecord || {}),
      existingFollowUps
    }
  });
  const nextV2Status = transition.nextStatus;
  const nextLegacyStatus = statusUpdate.nextLegacyStatus || (transition.changed ? transition.nextLegacyStatus : null);
  const nowIso = new Date().toISOString();
  const updates = {
    updated_at: nowIso
  };

  if (nextLegacyStatus) {
    updates.status = nextLegacyStatus;
  }

  if (transition.changed) {
    updates.case_record = {
      ...(currentLead.caseRecord || {}),
      status: nextV2Status,
      updatedAt: updates.updated_at
    };
    updates.admin_follow_up_record = {
      ...(currentLead.adminFollowUpRecord || {}),
      status: nextV2Status,
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
      ...(updates.case_record || currentLead.caseRecord || {}),
      assignedConsultantId: consultant?.id ?? null,
      assignedConsultantName: consultant?.name ?? "待确认",
      updatedAt: updates.updated_at
    };
  }

  const caseRecordPatch = buildCaseRecordPatch(
    payload,
    updates.case_record || currentLead.caseRecord,
    nowIso,
    nextV2Status
  );

  if (caseRecordPatch) {
    updates.case_record = caseRecordPatch;
  }

  const adminFollowUpPatch = buildAdminFollowUpPatch(
    payload,
    updates.admin_follow_up_record || currentLead.adminFollowUpRecord,
    nowIso
  );

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

function toTrimmedString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function buildTransitionPayload(newStatus, actorId, metadata = {}) {
  const payload = {
    v2Status: newStatus
  };
  const normalizedActor = toTrimmedString(actorId) || "系统";
  const normalizedReason = toTrimmedString(metadata.reason);
  const normalizedNextAction = toTrimmedString(metadata.nextAction);
  const normalizedNote = toTrimmedString(metadata.note);

  if (metadata.assignedConsultantId !== undefined) {
    payload.assignedConsultantId = metadata.assignedConsultantId;
  }

  if (normalizedNote) {
    payload.followUpAuthor = toTrimmedString(metadata.followUpAuthor) || normalizedActor;
    payload.followUpNote = normalizedNote;
  }

  if (newStatus === "closed") {
    payload.closeReason = toTrimmedString(metadata.closeReason) || normalizedReason;
    payload.closeNote = toTrimmedString(metadata.closeNote);
    payload.closeBy = toTrimmedString(metadata.closeBy) || normalizedActor;
  }

  if (newStatus === "nurturing") {
    payload.nurturingReason = toTrimmedString(metadata.nurturingReason) || normalizedReason;
    payload.nurturingNextAction = toTrimmedString(metadata.nurturingNextAction) || normalizedNextAction;
  }

  if (newStatus === "admin_following") {
    payload.reopenReason = toTrimmedString(metadata.reopenReason) || normalizedReason;
  }

  return payload;
}

export async function transitionCaseStatus({
  leadId,
  caseId,
  newStatus,
  actorId = "系统",
  metadata = {}
}) {
  const targetLeadId = toTrimmedString(leadId) || toTrimmedString(caseId);
  const targetStatus = toTrimmedString(newStatus);

  if (!targetLeadId) {
    throw new Error("transitionCaseStatus 缺少 leadId（或 caseId）。");
  }

  if (!targetStatus) {
    throw new Error("transitionCaseStatus 缺少 newStatus。");
  }

  const payload = buildTransitionPayload(targetStatus, actorId, metadata);
  return updateLead(targetLeadId, payload);
}
