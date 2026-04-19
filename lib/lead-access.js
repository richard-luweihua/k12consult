import { ADMIN_SESSION_COOKIE, hasAdminAuthConfig, verifyAdminSessionToken } from "./admin-auth.js";
import { getSessionUserFromRequest } from "./user-service.js";
import { USER_SESSION_COOKIE, verifyUserSessionToken } from "./user-auth.js";

const adminRoles = new Set(["admin", "super_admin"]);

function redactAdminInternalNotes(record) {
  if (!record || typeof record !== "object" || !("adminInternalNotes" in record)) {
    return record;
  }

  const rest = { ...record };
  delete rest.adminInternalNotes;
  return rest;
}

export function isAdminRole(role) {
  return adminRoles.has(role);
}

export function resolveConsultantKey(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  return user.consultant_id || user.consultantId || user.id || null;
}

export function isLeadOwnedByUser(lead, userId) {
  if (!lead || !userId) {
    return false;
  }

  return lead.userId === userId || lead.user_id === userId || lead.answers?.userId === userId;
}

export function isLeadAssignedToConsultant(lead, consultantKey) {
  if (!lead || !consultantKey) {
    return false;
  }

  return (
    lead.assignedConsultantId === consultantKey ||
    lead.assigned_consultant_id === consultantKey ||
    lead.caseRecord?.assignedConsultantId === consultantKey ||
    lead.assignment?.consultantId === consultantKey
  );
}

export function canActorViewLead(actor, lead) {
  if (!actor?.role || !lead) {
    return false;
  }

  if (isAdminRole(actor.role)) {
    return true;
  }

  if (actor.role === "consultant") {
    return isLeadAssignedToConsultant(lead, actor.consultantKey) || isLeadOwnedByUser(lead, actor.userId);
  }

  if (actor.role === "user" || actor.role === "parent_user") {
    return isLeadOwnedByUser(lead, actor.userId);
  }

  return false;
}

export function canActorOperateLead(actor, lead) {
  if (!actor?.role || !lead) {
    return false;
  }

  if (isAdminRole(actor.role)) {
    return true;
  }

  if (actor.role === "consultant") {
    return isLeadAssignedToConsultant(lead, actor.consultantKey);
  }

  return false;
}

export function sanitizeLeadForActor(actor, lead) {
  if (!lead || typeof lead !== "object") {
    return lead;
  }

  if (isAdminRole(actor?.role)) {
    return lead;
  }

  const sanitizedAdminFollowUpRecord = redactAdminInternalNotes(lead.adminFollowUpRecord);
  const sanitizedResultAdminFollowUpRecord = redactAdminInternalNotes(lead.result?.adminFollowUpRecord);

  return {
    ...lead,
    adminFollowUpRecord: sanitizedAdminFollowUpRecord,
    result:
      lead.result && typeof lead.result === "object"
        ? {
            ...lead.result,
            adminFollowUpRecord: sanitizedResultAdminFollowUpRecord
          }
        : lead.result
  };
}

export async function resolveActorFromRequest(request) {
  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const [sessionUser, legacyAdminAuthed] = await Promise.all([
    getSessionUserFromRequest(request),
    hasAdminAuthConfig() ? verifyAdminSessionToken(adminToken) : Promise.resolve(false)
  ]);

  return {
    sessionUser,
    userId: sessionUser?.id || null,
    consultantKey: resolveConsultantKey(sessionUser),
    role: sessionUser?.role || (legacyAdminAuthed ? "admin" : null),
    legacyAdminAuthed
  };
}

export async function resolveActorFromCookieStore(cookieStore) {
  const adminToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const userToken = cookieStore.get(USER_SESSION_COOKIE)?.value;
  const [sessionUser, legacyAdminAuthed] = await Promise.all([
    verifyUserSessionToken(userToken),
    hasAdminAuthConfig() ? verifyAdminSessionToken(adminToken) : Promise.resolve(false)
  ]);

  return {
    sessionUser,
    userId: sessionUser?.id || null,
    consultantKey: resolveConsultantKey(sessionUser),
    role: sessionUser?.role || (legacyAdminAuthed ? "admin" : null),
    legacyAdminAuthed
  };
}
