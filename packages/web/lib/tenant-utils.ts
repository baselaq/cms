/**
 * Extract subdomain from current browser hostname
 * Handles: club1.localhost:3000, club1.example.com, etc.
 */
export function extractSubdomainFromHostname(): string {
  if (typeof window === "undefined") {
    return "club1";
  }

  const hostname = window.location.hostname;
  let subdomain: string | null = null;

  // Try to extract from hostname (e.g., club1.localhost)
  const hostParts = hostname.split(".");
  if (hostParts.length >= 2 && hostParts[1].includes("localhost")) {
    subdomain = hostParts[0];
  } else if (hostParts.length >= 3) {
    // subdomain.example.com
    subdomain = hostParts[0] === "www" ? hostParts[1] : hostParts[0];
  }

  // Use default subdomain for development if none found
  return subdomain || "club1";
}
