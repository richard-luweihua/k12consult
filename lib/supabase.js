import { createClient } from "@supabase/supabase-js";

let cachedAdminClient;
let cachedBrowserClient;

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

export function getSupabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
}

export function getSupabaseServerKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function getSupabaseConfigState() {
  const url = getSupabaseUrl();
  const serverKey = getSupabaseServerKey();
  const missingVars = [];

  if (!url) {
    missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serverKey) {
    missingVars.push("SUPABASE_SECRET_KEY 或 SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    configured: missingVars.length === 0,
    missingVars
  };
}

export function hasSupabaseConfig() {
  return getSupabaseConfigState().configured && !isPlaceholderConfig();
}

// 检查 Supabase 是否为占位符配置
export function isPlaceholderConfig() {
  const url = getSupabaseUrl();
  return !url || url.includes("placeholder");
}

export function getSupabaseAdmin() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  if (!cachedAdminClient) {
    cachedAdminClient = createClient(
      getSupabaseUrl(),
      getSupabaseServerKey(),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  }

  return cachedAdminClient;
}

export async function diagnoseSupabase() {
  const config = getSupabaseConfigState();

  if (!config.configured) {
    return {
      configured: false,
      connected: false,
      missingVars: config.missingVars,
      reason: "missing_env",
      message: "Supabase 服务端配置还没补齐，当前会继续使用本地 JSON 兜底。"
    };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("consultants").select("id").limit(1);

    if (error) {
      return {
        configured: true,
        connected: false,
        missingVars: [],
        reason: "query_failed",
        message: `已读取到 Supabase 环境变量，但访问数据表失败：${error.message}`
      };
    }

    return {
      configured: true,
      connected: true,
      missingVars: [],
      reason: "connected",
      message: "Supabase 已连接，当前读写会优先走云端数据库。"
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      missingVars: [],
      reason: "connection_failed",
      message: `Supabase 连接失败：${error instanceof Error ? error.message : "未知错误"}`
    };
  }
}

export function getSupabaseBrowser() {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  if (!url || !key || key.includes("placeholder")) {
    return null;
  }

  if (!cachedBrowserClient) {
    cachedBrowserClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }

  return cachedBrowserClient;
}
