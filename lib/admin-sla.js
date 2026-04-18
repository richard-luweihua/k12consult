export function resolveFirstContactAnomaly(lead, options = {}) {
  const slaMinutes = Number(options.slaMinutes ?? 120);
  const now = Number(options.now ?? Date.now());

  if (lead?.consultationRequest?.requestStatus !== "submitted") {
    return null;
  }

  const submittedAt = lead.consultationRequest?.submittedAt || lead.createdAt;
  const submittedTime = submittedAt ? new Date(submittedAt).getTime() : Number.NaN;

  if (Number.isNaN(submittedTime)) {
    return null;
  }

  const firstContactAt = lead.adminFollowUpRecord?.firstContactAt;
  const firstContactTime = firstContactAt ? new Date(firstContactAt).getTime() : Number.NaN;

  if (!Number.isNaN(firstContactTime)) {
    const spendMinutes = Math.max(0, Math.round((firstContactTime - submittedTime) / 60000));

    if (spendMinutes <= slaMinutes) {
      return null;
    }

    return {
      mode: "contact_late",
      overtimeMinutes: spendMinutes - slaMinutes,
      submittedAt,
      firstContactAt
    };
  }

  const passedMinutes = Math.max(0, Math.round((now - submittedTime) / 60000));

  if (passedMinutes <= slaMinutes) {
    return null;
  }

  return {
    mode: "still_pending",
    overtimeMinutes: passedMinutes - slaMinutes,
    submittedAt,
    firstContactAt: null
  };
}

export function resolveAwaitingInfoAnomaly(lead, options = {}) {
  const thresholdDays = Number(options.thresholdDays ?? 7);
  const now = Number(options.now ?? Date.now());

  if (lead?.v2Status !== "awaiting_user_info") {
    return null;
  }

  const baseTime = lead.adminFollowUpRecord?.updatedAt || lead.updatedAt;
  const start = baseTime ? new Date(baseTime).getTime() : Number.NaN;

  if (Number.isNaN(start)) {
    return null;
  }

  const days = Math.max(0, Math.floor((now - start) / (24 * 60 * 60 * 1000)));

  if (days < thresholdDays) {
    return null;
  }

  return {
    waitDays: days,
    baseTime
  };
}
