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

export function absoluteAppUrl(path = "/", requestUrl = "http://localhost:3000") {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const origin = configuredSiteUrl ? new URL(configuredSiteUrl).origin : new URL(requestUrl).origin;

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
