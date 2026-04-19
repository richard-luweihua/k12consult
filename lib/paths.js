function normalizeBasePath(value) {
  const raw = String(value || "").trim();

  if (!raw || raw === "/") {
    return "";
  }

  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

export const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export function appPath(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!basePath) {
    return normalizedPath;
  }

  if (normalizedPath === "/") {
    return basePath;
  }

  if (normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`)) {
    return normalizedPath;
  }

  return `${basePath}${normalizedPath}`;
}

export function apiPath(path) {
  return appPath(path.startsWith("/api/") ? path : `/api/${path.replace(/^\/+/, "")}`);
}

function toRequestOrigin(requestLike, fallbackOrigin = "http://localhost:3000") {
  if (!requestLike) {
    return fallbackOrigin;
  }

  const requestUrl = typeof requestLike === "string" ? requestLike : requestLike.url;
  const headers = typeof requestLike === "object" && requestLike?.headers ? requestLike.headers : null;
  let originFromRequest = fallbackOrigin;

  try {
    originFromRequest = new URL(requestUrl || fallbackOrigin).origin;
  } catch {
    originFromRequest = fallbackOrigin;
  }

  if (!headers?.get) {
    return originFromRequest;
  }

  const originHeader = headers.get("origin");
  if (originHeader) {
    try {
      return new URL(originHeader).origin;
    } catch {
      // fall through to host-based reconstruction
    }
  }

  const forwardedHost = headers.get("x-forwarded-host");
  const host = forwardedHost || headers.get("host");

  if (!host) {
    return originFromRequest;
  }

  const forwardedProto = headers.get("x-forwarded-proto");
  const protocol = forwardedProto ? forwardedProto.split(",")[0].trim() : originFromRequest.split(":")[0];

  return `${protocol}://${host}`;
}

export function absoluteAppUrl(path = "/", requestLike = "http://localhost:3000") {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const origin = configuredSiteUrl ? new URL(configuredSiteUrl).origin : toRequestOrigin(requestLike);

  return new URL(appPath(path), origin);
}

export function stripBasePath(pathname) {
  if (!basePath || pathname === basePath) {
    return pathname === basePath ? "/" : pathname;
  }

  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length) || "/";
  }

  return pathname;
}
