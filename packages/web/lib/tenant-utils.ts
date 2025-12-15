import { getAppDomain } from "./app-config";

/**
 * Extract subdomain from current browser hostname
 * Handles: club1.localhost:3000, club1.example.com, example.cms.test, etc.
 * Returns null when on main domain (cms.test or localhost without subdomain)
 */
export function extractSubdomainFromHostname(): string | null {
  if (typeof window === "undefined") {
    // SSR - return null for main domain, or use env var if provided
    const envSubdomain = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN;
    return envSubdomain || null;
  }

  const hostname = window.location.hostname;
  const appDomain = getAppDomain();

  if (process.env.NODE_ENV === "development") {
    console.log(
      `🔍 [tenant-utils] Extracting subdomain from hostname: ${hostname}`
    );
  }

  let subdomain: string | null = null;

  // Handle app domain subdomains (e.g., example.cms.test)
  if (hostname.endsWith(`.${appDomain}`) || hostname === appDomain) {
    const parts = hostname.split(".");
    if (hostname === appDomain) {
      // Main domain, no subdomain
      subdomain = null;
    } else if (parts.length >= 3) {
      // Extract subdomain from example.cms.test
      const domainParts = appDomain.split(".");
      const domainLength = domainParts.length;
      // Remove the domain parts from the end
      subdomain = parts.slice(0, -domainLength).join(".");
    }
    if (subdomain && process.env.NODE_ENV === "development") {
      console.log(
        `✅ [tenant-utils] Extracted subdomain: ${subdomain} from ${hostname} (${appDomain})`
      );
    }
  }
  // Handle localhost subdomains (e.g., club1.localhost)
  else if (hostname.includes("localhost")) {
    const hostParts = hostname.split(".");
    if (hostParts.length >= 2 && hostParts[1].includes("localhost")) {
      subdomain = hostParts[0];
      if (process.env.NODE_ENV === "development") {
        console.log(
          `✅ [tenant-utils] Extracted subdomain: ${subdomain} from ${hostname} (localhost)`
        );
      }
    }
  }
  // Handle other domains (e.g., subdomain.example.com)
  else {
    const hostParts = hostname.split(".");
    if (hostParts.length >= 3) {
      subdomain = hostParts[0] === "www" ? hostParts[1] : hostParts[0];
      if (process.env.NODE_ENV === "development") {
        console.log(
          `✅ [tenant-utils] Extracted subdomain: ${subdomain} from ${hostname}`
        );
      }
    }
  }

  // Return the extracted subdomain (null if on main domain)
  // Only use env var as fallback if explicitly set
  const finalSubdomain =
    subdomain || process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN || null;

  if (process.env.NODE_ENV === "development") {
    if (finalSubdomain) {
      console.log(
        `✅ [tenant-utils] Using subdomain: ${finalSubdomain} from hostname: ${hostname}`
      );
    } else {
      console.log(
        `ℹ️ [tenant-utils] No subdomain found (main domain): ${hostname}`
      );
    }
  }

  return finalSubdomain;
}
