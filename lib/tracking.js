import { getOptionLabel } from "./schema.js";

export function normalizeLeadPayload(payload) {
  const {
    tracking = {},
    ...answers
  } = payload;

  const normalizedTracking = {
    utmSource: tracking.utmSource || "",
    utmMedium: tracking.utmMedium || "",
    utmCampaign: tracking.utmCampaign || "",
    utmContent: tracking.utmContent || "",
    entryPath: tracking.entryPath || "",
    landingUrl: tracking.landingUrl || "",
    referrer: tracking.referrer || ""
  };

  const effectiveChannel = normalizedTracking.utmSource || answers.sourceChannel || "direct";

  return {
    answers,
    tracking: {
      ...normalizedTracking,
      effectiveChannel
    }
  };
}

export function getChannelLabel(channel) {
  if (!channel) {
    return "未标记";
  }

  const fromSchema = getOptionLabel("sourceChannel", channel);

  if (fromSchema !== channel) {
    return fromSchema;
  }

  const generic = {
    direct: "直接访问",
    paid: "投放渠道",
    organic: "自然流量"
  };

  return generic[channel] ?? channel;
}

export function getLeadChannel(lead) {
  return (
    lead.effectiveChannel ||
    lead.tracking?.effectiveChannel ||
    lead.sourceChannel ||
    lead.answers?.sourceChannel ||
    "direct"
  );
}

export function buildLeadStats(leads) {
  const summary = {
    total: leads.length,
    high: leads.filter((lead) => lead.result.scores.priority === "高").length,
    active: leads.filter((lead) => ["已派单", "顾问已接收", "跟进中"].includes(lead.status)).length,
    converted: leads.filter((lead) => lead.status === "已转化").length
  };

  const channelMap = new Map();
  const campaignMap = new Map();

  for (const lead of leads) {
    const channel = getLeadChannel(lead);
    const campaign = lead.utmCampaign || lead.tracking?.utmCampaign || "未命名活动";

    if (!channelMap.has(channel)) {
      channelMap.set(channel, {
        key: channel,
        label: getChannelLabel(channel),
        total: 0,
        high: 0,
        active: 0,
        converted: 0
      });
    }

    if (!campaignMap.has(campaign)) {
      campaignMap.set(campaign, {
        name: campaign,
        leads: 0,
        high: 0
      });
    }

    const channelEntry = channelMap.get(channel);
    const campaignEntry = campaignMap.get(campaign);

    channelEntry.total += 1;
    campaignEntry.leads += 1;

    if (lead.result.scores.priority === "高") {
      channelEntry.high += 1;
      campaignEntry.high += 1;
    }

    if (["已派单", "顾问已接收", "跟进中"].includes(lead.status)) {
      channelEntry.active += 1;
    }

    if (lead.status === "已转化") {
      channelEntry.converted += 1;
    }
  }

  return {
    summary,
    channels: [...channelMap.values()].sort((a, b) => b.total - a.total),
    campaigns: [...campaignMap.values()].sort((a, b) => b.leads - a.leads).slice(0, 5)
  };
}
