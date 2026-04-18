import { resolveAwaitingInfoAnomaly, resolveFirstContactAnomaly } from "./admin-sla.js";
import { ValidationError } from "./case-flow.js";
import { listLeads, readDb, resolveCurrentV2Status, updateLead, writeDb } from "./data.js";

const consultantStatuses = new Set(["active", "on_leave", "inactive"]);

function toArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toInt(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    throw new ValidationError(`${field} 必须是数字。`);
  }

  if (parsed < min || parsed > max) {
    throw new ValidationError(`${field} 超出允许范围。`);
  }

  return parsed;
}

function toTrimmedString(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim();
}

function normalizeEmail(email) {
  const trimmed = toTrimmedString(email);

  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ValidationError("邮箱格式不正确。");
  }

  return normalized;
}

export function normalizeConsultantPayload(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("顾问参数不能为空。");
  }

  const normalized = {};

  if ("name" in payload) {
    const name = toTrimmedString(payload.name);

    if (!name) {
      throw new ValidationError("顾问姓名不能为空。");
    }

    normalized.name = name;
  }

  if ("email" in payload) {
    const email = normalizeEmail(payload.email);

    if (!email) {
      throw new ValidationError("顾问邮箱不能为空。");
    }

    normalized.email = email;
  }

  if ("mobile" in payload) {
    normalized.mobile = toTrimmedString(payload.mobile) || "";
  }

  if ("title" in payload) {
    normalized.title = toTrimmedString(payload.title) || "";
  }

  if ("focusLabel" in payload) {
    normalized.focusLabel = toTrimmedString(payload.focusLabel) || "";
  }

  if ("specialties" in payload) {
    normalized.specialties = toArray(payload.specialties);
  }

  if ("gradeFocus" in payload) {
    normalized.gradeFocus = toArray(payload.gradeFocus);
  }

  if ("capacityDaily" in payload) {
    normalized.capacityDaily = toInt(payload.capacityDaily, "capacityDaily", { min: 0, max: 1000 });
  }

  if ("capacityActive" in payload) {
    normalized.capacityActive = toInt(payload.capacityActive, "capacityActive", { min: 0, max: 100000 });
  }

  if ("priorityWeight" in payload) {
    normalized.priorityWeight = toInt(payload.priorityWeight, "priorityWeight", { min: 0, max: 100 });
  }

  if ("status" in payload) {
    const status = toTrimmedString(payload.status);

    if (!status || !consultantStatuses.has(status)) {
      throw new ValidationError("顾问状态不合法。");
    }

    normalized.status = status;
  }

  if (!partial) {
    if (!normalized.name) {
      throw new ValidationError("顾问姓名不能为空。");
    }

    if (!normalized.email) {
      throw new ValidationError("顾问邮箱不能为空。");
    }
  }

  if (partial && Object.keys(normalized).length === 0) {
    throw new ValidationError("没有可更新的顾问字段。");
  }

  return normalized;
}

function hasDuplicateEmail(consultants, email, excludeId = null) {
  return consultants.some((item) => item.email?.toLowerCase() === email.toLowerCase() && item.id !== excludeId);
}

function resolveAssignedConsultantId(lead) {
  return lead.assignedConsultantId || lead.assigned_consultant_id || lead.assignment?.consultantId || null;
}

export function filterAdminCases(leads, filters = {}) {
  const filterV2Status = typeof filters.v2Status === "string" ? filters.v2Status.trim() : "";
  const filterIntent = typeof filters.intentLevel === "string" ? filters.intentLevel.trim() : "";
  const filterBudget = typeof filters.budgetLevel === "string" ? filters.budgetLevel.trim() : "";
  const filterConsultant = typeof filters.consultantId === "string" ? filters.consultantId.trim() : "";
  const filterAssigned = typeof filters.assigned === "string" ? filters.assigned.trim() : "";
  const keyword = typeof filters.keyword === "string" ? filters.keyword.trim().toLowerCase() : "";

  return leads
    .filter((lead) => {
      if (filterV2Status && filterV2Status !== "all" && lead.v2Status !== filterV2Status) {
        return false;
      }

      if (filterIntent && lead.adminFollowUpRecord?.intentLevel !== filterIntent) {
        return false;
      }

      if (filterBudget && lead.adminFollowUpRecord?.budgetLevel !== filterBudget) {
        return false;
      }

      const assignedConsultantId = resolveAssignedConsultantId(lead);

      if (filterConsultant && assignedConsultantId !== filterConsultant) {
        return false;
      }

      if (filterAssigned === "true" && !assignedConsultantId) {
        return false;
      }

      if (filterAssigned === "false" && assignedConsultantId) {
        return false;
      }

      if (keyword) {
        const haystack = [
          lead.id,
          lead.answers?.contactName,
          lead.answers?.studentName,
          lead.assignment?.consultantName
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(keyword)) {
          return false;
        }
      }

      return true;
    })
    .sort((left, right) => {
      const leftTime = new Date(left.updatedAt || left.updated_at || left.createdAt || 0).getTime();
      const rightTime = new Date(right.updatedAt || right.updated_at || right.createdAt || 0).getTime();
      return rightTime - leftTime;
    });
}

export async function listAdminCases(filters = {}) {
  const { leads, consultants, storageMode } = await listLeads();
  const now = Date.now();
  const enriched = leads.map((lead) => {
    const v2Status = resolveCurrentV2Status(lead);
    return {
      ...lead,
      v2Status,
      sla: {
        firstContact: resolveFirstContactAnomaly(lead, { now }),
        awaitingInfo: resolveAwaitingInfoAnomaly({ ...lead, v2Status }, { now })
      }
    };
  });

  return {
    leads: filterAdminCases(enriched, filters),
    consultants,
    storageMode
  };
}

export async function listConsultants() {
  const db = await readDb();
  return [...(db.consultants || [])].sort((a, b) => {
    const left = String(a.name || "");
    const right = String(b.name || "");
    return left.localeCompare(right, "zh-CN");
  });
}

export async function createConsultant(payload) {
  const normalized = normalizeConsultantPayload(payload, { partial: false });
  const db = await readDb();
  const consultants = db.consultants || [];

  if (hasDuplicateEmail(consultants, normalized.email)) {
    throw new ValidationError("顾问邮箱已存在。");
  }

  const now = new Date().toISOString();
  const consultant = {
    id: `consultant-${crypto.randomUUID().slice(0, 8)}`,
    name: normalized.name,
    email: normalized.email,
    mobile: normalized.mobile || "",
    title: normalized.title || "",
    focusLabel: normalized.focusLabel || normalized.title || "",
    specialties: normalized.specialties || [],
    gradeFocus: normalized.gradeFocus || [],
    capacityDaily: normalized.capacityDaily ?? 0,
    capacityActive: normalized.capacityActive ?? 0,
    status: normalized.status || "active",
    priorityWeight: normalized.priorityWeight ?? 50,
    createdAt: now,
    updatedAt: now
  };

  db.consultants = [consultant, ...consultants];
  await writeDb(db);

  return consultant;
}

export async function updateConsultant(consultantId, payload) {
  const normalized = normalizeConsultantPayload(payload, { partial: true });
  const db = await readDb();
  const consultants = db.consultants || [];
  const index = consultants.findIndex((item) => item.id === consultantId);

  if (index === -1) {
    return null;
  }

  if (normalized.email && hasDuplicateEmail(consultants, normalized.email, consultantId)) {
    throw new ValidationError("顾问邮箱已存在。");
  }

  const current = consultants[index];
  const updated = {
    ...current,
    ...normalized,
    focusLabel: normalized.focusLabel ?? current.focusLabel ?? normalized.title ?? current.title ?? "",
    updatedAt: new Date().toISOString()
  };

  consultants[index] = updated;
  db.consultants = consultants;
  await writeDb(db);

  return updated;
}

export async function deleteConsultant(consultantId) {
  const db = await readDb();
  const consultants = db.consultants || [];
  const index = consultants.findIndex((item) => item.id === consultantId);

  if (index === -1) {
    return null;
  }

  const { leads } = await listLeads();
  const blockingCases = leads.filter((lead) => {
    const assignedConsultantId = resolveAssignedConsultantId(lead);
    const v2Status = resolveCurrentV2Status(lead);
    return assignedConsultantId === consultantId && !["closed", "nurturing"].includes(v2Status);
  });

  if (blockingCases.length > 0) {
    throw new ValidationError(`该顾问仍有 ${blockingCases.length} 条进行中案例，请先转派后再停用。`);
  }

  const updated = {
    ...consultants[index],
    status: "inactive",
    updatedAt: new Date().toISOString()
  };

  consultants[index] = updated;
  db.consultants = consultants;
  await writeDb(db);

  return updated;
}

export async function assignCaseToConsultant(leadId, consultantId) {
  if (!consultantId) {
    throw new ValidationError("请先选择顾问。");
  }

  const { consultants } = await listLeads();
  const matched = consultants.find((item) => item.id === consultantId);

  if (!matched) {
    throw new ValidationError("顾问不存在。");
  }

  return updateLead(leadId, {
    assignedConsultantId: consultantId,
    v2Status: "consult_assigned"
  });
}

export { ValidationError };
