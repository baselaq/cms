/**
 * Extract subdomain from current browser hostname
 * Handles: club1.localhost:3000, club1.example.com, etc.
 */
export function extractSubdomainFromHostname(): string {
  if (typeof window === "undefined") {
    // SSR - use env var or default
    const envSubdomain = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN;
    return envSubdomain || "club1";
  }

  const hostname = window.location.hostname;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 [tenant-utils] Extracting subdomain from hostname: ${hostname}`);
  }

  let subdomain: string | null = null;

  // Try to extract from hostname (e.g., club1.localhost)
  const hostParts = hostname.split(".");
  if (hostParts.length >= 2 && hostParts[1].includes("localhost")) {
    subdomain = hostParts[0];
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [tenant-utils] Extracted subdomain: ${subdomain} from ${hostname}`);
    }
  } else if (hostParts.length >= 3) {
    // subdomain.example.com
    subdomain = hostParts[0] === "www" ? hostParts[1] : hostParts[0];
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [tenant-utils] Extracted subdomain: ${subdomain} from ${hostname}`);
    }
  }

  // Use env var or default subdomain for development if none found
  const finalSubdomain = subdomain || process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN || "club1";
  
  if (process.env.NODE_ENV === 'development' && !subdomain) {
    console.warn(`⚠️ [tenant-utils] No subdomain found in hostname "${hostname}", using default: ${finalSubdomain}`);
  }

  return finalSubdomain;
}
