/**
 * Application configuration
 * Reads from environment variables with sensible defaults
 */

/**
 * Get the base domain for the application
 * Default: cms.test (for testing)
 * Production: Should be set via NEXT_PUBLIC_APP_DOMAIN
 */
export function getAppDomain(): string {
  return process.env.NEXT_PUBLIC_APP_DOMAIN || "cms.test";
}

/**
 * Get the frontend port
 * Default: 3001
 * Production: Usually 80/443 (handled by reverse proxy)
 */
export function getFrontendPort(): string {
  return process.env.NEXT_PUBLIC_FRONTEND_PORT || "3001";
}

/**
 * Get the backend API port
 * Default: 3000
 * Production: Usually 80/443 (handled by reverse proxy)
 */
export function getBackendPort(): string {
  return process.env.NEXT_PUBLIC_BACKEND_PORT || "3000";
}

/**
 * Get the full frontend URL (with protocol and port if needed)
 */
export function getFrontendUrl(subdomain?: string): string {
  const domain = getAppDomain();
  const port = getFrontendPort();
  const protocol = process.env.NEXT_PUBLIC_PROTOCOL || "http";

  // In production, ports are usually handled by reverse proxy
  const includePort = process.env.NODE_ENV === "development";
  const portSuffix = includePort && port ? `:${port}` : "";

  if (subdomain) {
    return `${protocol}://${subdomain}.${domain}${portSuffix}`;
  }

  return `${protocol}://${domain}${portSuffix}`;
}

/**
 * Get the full backend API URL (with protocol and port if needed)
 */
export function getBackendUrl(): string {
  const domain = getAppDomain();
  const port = getBackendPort();
  const protocol = process.env.NEXT_PUBLIC_PROTOCOL || "http";

  // In production, ports are usually handled by reverse proxy
  const includePort = process.env.NODE_ENV === "development";
  const portSuffix = includePort && port ? `:${port}` : "";

  // Backend is typically on the main domain
  return `${protocol}://${domain}${portSuffix}`;
}

/**
 * Build a club subdomain URL
 */
export function getClubUrl(subdomain: string, path = ""): string {
  const baseUrl = getFrontendUrl(subdomain);
  return path
    ? `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`
    : baseUrl;
}
