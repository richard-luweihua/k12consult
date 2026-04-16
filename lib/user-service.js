import { getSupabaseAdmin, getSupabaseServerKey, getSupabaseUrl, hasSupabaseConfig } from "./supabase.js";
import { USER_SESSION_COOKIE, verifyUserSessionToken } from "./user-auth.js";

let usersTableAvailable;

function normalizeAuthUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    role: user.app_metadata?.role || "user",
    consultant_id: user.app_metadata?.consultant_id || null,
    consultantId: user.app_metadata?.consultant_id || null,
    created_at: user.created_at || new Date().toISOString()
  };
}

function normalizeProfileRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    consultant_id: row.consultant_id || null,
    consultantId: row.consultant_id || null,
    created_at: row.created_at
  };
}

async function hasUsersTable() {
  if (typeof usersTableAvailable === "boolean") {
    return usersTableAvailable;
  }

  const response = await fetch(`${getSupabaseUrl()}/rest/v1/users?select=id&limit=1`, {
    headers: {
      apikey: getSupabaseServerKey(),
      authorization: `Bearer ${getSupabaseServerKey()}`
    },
    cache: "no-store"
  });

  usersTableAvailable = response.status !== 404;
  return usersTableAvailable;
}

export async function ensureUserProfile({ id, email, full_name, role = "user", consultant_id = null }) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase 服务端配置缺失，无法创建用户档案。");
  }

  if (!(await hasUsersTable())) {
    return {
      id,
      email,
      full_name: full_name || email.split("@")[0],
      role,
      consultant_id,
      consultantId: consultant_id,
      created_at: new Date().toISOString()
    };
  }

  const supabase = getSupabaseAdmin();
  const payload = {
    id,
    email,
    full_name: full_name || email.split("@")[0],
    role,
    is_active: true,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("users")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    ...normalizeProfileRow(data),
    consultant_id,
    consultantId: consultant_id
  };
}

export async function getUserProfileById(userId) {
  if (!userId || !hasSupabaseConfig()) {
    return null;
  }

  if (await hasUsersTable()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return normalizeProfileRow(data);
    }
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  return normalizeAuthUser(data.user);
}

export async function registerUser({ email, password, fullName, role = "user", consultantId = null }) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase 服务端配置缺失，暂时无法注册。");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName
    },
    app_metadata: {
      role,
      consultant_id: consultantId
    }
  });

  if (error) {
    throw error;
  }

  return ensureUserProfile({
    id: data.user.id,
    email: data.user.email,
    full_name: fullName || data.user.user_metadata?.full_name || email.split("@")[0],
    role: data.user.app_metadata?.role || role,
    consultant_id: data.user.app_metadata?.consultant_id || consultantId || null
  });
}

export async function loginUser({ email, password }) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase 服务端配置缺失，暂时无法登录。");
  }

  const response = await fetch(`${getSupabaseUrl()}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: getSupabaseServerKey(),
      authorization: `Bearer ${getSupabaseServerKey()}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store"
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.msg || payload.error_description || payload.error || "登录失败");
  }

  return ensureUserProfile({
    id: payload.user.id,
    email: payload.user.email,
    full_name: payload.user.user_metadata?.full_name || payload.user.email?.split("@")[0],
    role: payload.user.app_metadata?.role || "user",
    consultant_id: payload.user.app_metadata?.consultant_id || null
  });
}

export async function getSessionUserFromRequest(request) {
  const token = request.cookies.get(USER_SESSION_COOKIE)?.value;
  const session = await verifyUserSessionToken(token);

  if (!session?.id) {
    return null;
  }

  try {
    return (await getUserProfileById(session.id)) || session;
  } catch {
    return session;
  }
}

export async function deleteAuthUser(userId) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw error;
  }
}
