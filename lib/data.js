import { promises as fs } from "fs";
import path from "path";
import { defaultConsultants, defaultDbTemplate } from "./consultants.js";
import { generateResult, recommendConsultant } from "./intake.js";
import { notifyLeadCreated, notifyLeadUpdated } from "./notifications.js";
import { getSupabaseAdmin, hasSupabaseConfig } from "./supabase.js";
import { getChannelLabel, normalizeLeadPayload } from "./tracking.js";

const dbPath = path.join(process.cwd(), "data", "db.json");

function getStorageMode() {
  return hasSupabaseConfig() ? "supabase" : "file";
}

function annotateLead(lead) {
  if (!lead) {
    return null;
  }

  const effectiveChannel = lead.effectiveChannel || lead.tracking?.effectiveChannel || lead.answers?.sourceChannel || "direct";

  return {
    ...lead,
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
  return JSON.parse(content);
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
    priority: row.priority ?? row.result?.scores?.priority ?? null,
    grade: row.grade ?? row.result?.scores?.grade ?? null,
    assignment: row.assignment,
    answers: row.answers,
    result: row.result,
    followUps: followUps.map((item) => ({
      id: item.id,
      createdAt: item.created_at,
      author: item.author,
      note: item.note
    }))
  });
}

async function createLeadInFile(payload) {
  const db = await readDb();
  const { answers, tracking } = normalizeLeadPayload(payload);
  const result = generateResult(answers);
  const assignment = recommendConsultant(result, db.consultants, db.leads);
  const now = new Date().toISOString();

  const lead = annotateLead({
    id: crypto.randomUUID(),
    createdAt: now,
    created_at: now,
    updatedAt: now,
    updated_at: now,
    userId: payload.userId ?? null,
    user_id: payload.userId ?? null,
    status: assignment.consultantId ? "已派单" : "待派单",
    assignedConsultantId: assignment.consultantId,
    assigned_consultant_id: assignment.consultantId,
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
    followUps: [
      {
        id: crypto.randomUUID(),
        createdAt: now,
        author: "系统",
        note: `已完成前诊并生成结果，建议派给 ${assignment.consultantName}。`
      }
    ]
  });

  db.leads.unshift(lead);
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
  const nextLead = {
    ...currentLead,
    updatedAt: new Date().toISOString()
  };

  if (payload.status) {
    nextLead.status = payload.status;
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
  }

  if (payload.followUpNote) {
    nextLead.followUps = [
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        author: payload.followUpAuthor || "顾问",
        note: payload.followUpNote
      },
      ...currentLead.followUps
    ];
  }

  db.leads[leadIndex] = nextLead;
  await writeDb(db);
  const annotatedLead = {
    ...annotateLead(nextLead),
    previousStatus
  };
  await notifyLeadUpdated(annotatedLead, payload);

  return annotatedLead;
}

async function createLeadInSupabase(payload) {
  const supabase = getSupabaseAdmin();
  await ensureSupabaseConsultants(supabase);

  const { answers, tracking } = normalizeLeadPayload(payload);
  const result = generateResult(answers);
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

  const assignment = recommendConsultant(
    result,
    consultants,
    activeLeadRows.map((row) => ({
      id: row.id,
      status: row.status,
      assignedConsultantId: row.assigned_consultant_id
    }))
  );
  const now = new Date().toISOString();

  const row = {
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
    user_id: payload.userId, // 添加用户ID
    status: assignment.consultantId ? "已派单" : "待派单",
    assigned_consultant_id: assignment.consultantId,
    source_channel: answers.sourceChannel,
    effective_channel: tracking.effectiveChannel,
    utm_source: tracking.utmSource,
    utm_medium: tracking.utmMedium,
    utm_campaign: tracking.utmCampaign,
    utm_content: tracking.utmContent,
    entry_path: tracking.entryPath,
    landing_url: tracking.landingUrl,
    referrer: tracking.referrer,
    priority: result.scores.priority,
    grade: result.scores.grade,
    answers,
    result,
    assignment
  };

  let insertedLead;
  let insertLeadError;

  ({ data: insertedLead, error: insertLeadError } = await supabase.from("leads").insert(row).select("*").single());

  if (insertLeadError?.message?.includes("user_id")) {
    const fallbackRow = { ...row };
    delete fallbackRow.user_id;

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
    lead_id: row.id,
    created_at: now,
    author: "系统",
    note: `已完成前诊并生成结果，建议派给 ${assignment.consultantName}。`
  };

  const { data: insertedFollowUp, error: insertFollowUpError } = await supabase
    .from("follow_ups")
    .insert(firstFollowUp)
    .select("*")
    .single();

  if (insertFollowUpError) {
    throw insertFollowUpError;
  }

  const lead = normalizeLeadRow(insertedLead, [insertedFollowUp]);
  await notifyLeadCreated(lead);
  return lead;
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
  const updates = {
    updated_at: new Date().toISOString()
  };

  if (payload.status) {
    updates.status = payload.status;
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
  }

  const { data: updatedRow, error: updateError } = await supabase.from("leads").update(updates).eq("id", leadId).select("*").single();

  if (updateError) {
    throw updateError;
  }

  if (payload.followUpNote) {
    const { error: followUpError } = await supabase.from("follow_ups").insert({
      id: crypto.randomUUID(),
      lead_id: leadId,
      created_at: new Date().toISOString(),
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
  await notifyLeadUpdated(updatedLead, payload);
  return updatedLead;
}

async function withStorageFallback(supabaseHandler, fileHandler) {
  if (!hasSupabaseConfig()) {
    return fileHandler();
  }

  try {
    return await supabaseHandler();
  } catch (error) {
    console.error("[storage] supabase failed, fallback to file storage", error);
    return fileHandler();
  }
}

export async function createLead(payload) {
  return withStorageFallback(() => createLeadInSupabase(payload), () => createLeadInFile(payload));
}

export async function listLeads() {
  return withStorageFallback(() => listLeadsFromSupabase(), () => listLeadsFromFile());
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
  return withStorageFallback(() => getLeadFromSupabase(leadId), () => getLeadFromFile(leadId));
}

export async function updateLead(leadId, payload) {
  return withStorageFallback(() => updateLeadInSupabase(leadId, payload), () => updateLeadInFile(leadId, payload));
}
