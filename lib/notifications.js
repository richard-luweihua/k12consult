function isValidWebhookUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function getWeComConfigState() {
  const defaultWebhook = process.env.WECOM_WEBHOOK_URL || "";
  const highPriorityWebhook = process.env.WECOM_HIGH_PRIORITY_WEBHOOK_URL || "";
  const defaultConfigured = Boolean(defaultWebhook);
  const highPriorityConfigured = Boolean(highPriorityWebhook);
  const invalidVars = [];

  if (defaultConfigured && !isValidWebhookUrl(defaultWebhook)) {
    invalidVars.push("WECOM_WEBHOOK_URL");
  }

  if (highPriorityConfigured && !isValidWebhookUrl(highPriorityWebhook)) {
    invalidVars.push("WECOM_HIGH_PRIORITY_WEBHOOK_URL");
  }

  return {
    configured: defaultConfigured || highPriorityConfigured,
    valid: invalidVars.length === 0,
    defaultConfigured,
    highPriorityConfigured,
    invalidVars
  };
}

export function diagnoseWeCom() {
  const config = getWeComConfigState();

  if (!config.configured) {
    return {
      ...config,
      ready: false,
      message: "企业微信 webhook 还没配置，通知功能当前会自动跳过。"
    };
  }

  if (!config.valid) {
    return {
      ...config,
      ready: false,
      message: `企业微信 webhook 格式不正确：${config.invalidVars.join("、")}`
    };
  }

  if (!config.defaultConfigured && config.highPriorityConfigured) {
    return {
      ...config,
      ready: true,
      message: "只配置了高优先级 webhook，高优先级线索可通知，普通线索会跳过。"
    };
  }

  if (config.defaultConfigured && !config.highPriorityConfigured) {
    return {
      ...config,
      ready: true,
      message: "已配置默认 webhook，高优先级线索会先尝试走高优先级通道，不存在时回落到默认通道。"
    };
  }

  return {
    ...config,
    ready: true,
    message: "默认 webhook 和高优先级 webhook 都已配置，企业微信通知已就绪。"
  };
}

function resolveWebhook(lead) {
  if (lead.result?.scores?.priority === "高" && process.env.WECOM_HIGH_PRIORITY_WEBHOOK_URL) {
    return process.env.WECOM_HIGH_PRIORITY_WEBHOOK_URL;
  }

  return process.env.WECOM_WEBHOOK_URL;
}

async function postToWeCom(content, lead) {
  const webhook = resolveWebhook(lead);

  if (!webhook) {
    return { skipped: true, reason: "missing webhook" };
  }

  const response = await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      msgtype: "markdown",
      markdown: {
        content
      }
    })
  });

  if (!response.ok) {
    throw new Error(`企微通知发送失败: ${response.status}`);
  }

  return {
    skipped: false,
    target:
      lead.result?.scores?.priority === "高" && process.env.WECOM_HIGH_PRIORITY_WEBHOOK_URL
        ? "high-priority"
        : "default"
  };
}

export async function notifyLeadCreated(lead) {
  const content = [
    "## 新前诊线索进入系统",
    `> 家长：${lead.answers.contactName}`,
    `> 孩子：${lead.answers.studentName}`,
    `> 路径初判：${lead.result.primaryPathLabel}`,
    `> 综合评级：${lead.result.scores.grade} / ${lead.result.scores.priority}优先级`,
    `> 推荐顾问：${lead.assignment.consultantName}`,
    `> 渠道：${lead.channelLabel}`,
    `> 活动：${lead.utmCampaign || "未命名活动"}`,
    `> 联系方式：${lead.answers.contactMethod}`
  ].join("\n");

  try {
    return await postToWeCom(content, lead);
  } catch (error) {
    console.error("[wecom] new lead notification failed", error);
    return { skipped: true, reason: "request failed" };
  }
}

export async function notifyLeadUpdated(lead, payload) {
  const statusChanged = payload.status && payload.status !== lead.previousStatus;
  const noteAdded = Boolean(payload.followUpNote);

  if (!statusChanged && !noteAdded) {
    return { skipped: true, reason: "no-op" };
  }

  const content = [
    "## 线索状态更新",
    `> 家长：${lead.answers.contactName}`,
    `> 当前状态：${lead.status}`,
    `> 顾问：${lead.assignment.consultantName}`,
    statusChanged ? `> 状态变更：${lead.previousStatus} -> ${lead.status}` : null,
    noteAdded ? `> 新增跟进：${payload.followUpNote}` : null
  ]
    .filter(Boolean)
    .join("\n");

  try {
    return await postToWeCom(content, lead);
  } catch (error) {
    console.error("[wecom] lead update notification failed", error);
    return { skipped: true, reason: "request failed" };
  }
}

export async function sendWeComTestNotification(priority = "normal") {
  const effectivePriority = priority === "high" ? "高" : "中";
  const content = [
    "## 企业微信通知联调测试",
    `> 通知类型：${priority === "high" ? "高优先级测试" : "普通测试"}`,
    `> 发送时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    "> 来源：Codex 本地联调",
    "> 说明：如果你看到了这条消息，说明当前 webhook 配置已经可用。"
  ].join("\n");

  return postToWeCom(content, {
    result: {
      scores: {
        priority: effectivePriority
      }
    }
  });
}
