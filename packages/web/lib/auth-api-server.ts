/**
 * Server-side API functions for authentication
 * These are used in Next.js server components and server actions
 */

export interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
  permissions: string[];
  onboardingComplete: boolean;
}

/**
 * Get current user info from server-side
 * This requires an access token cookie
 */
export async function getMeServer(
  accessToken: string,
  subdomain: string | null,
): Promise<MeResponse> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    `http://${process.env.NEXT_PUBLIC_APP_DOMAIN || "cms.test"}:${
      process.env.NEXT_PUBLIC_BACKEND_PORT || "3000"
    }`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  if (subdomain) {
    headers["X-Tenant-Subdomain"] = subdomain;
  }

  const response = await fetch(`${backendUrl}/api/auth/me`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.statusText}`);
  }

  // Check onboarding status from response header
  const onboardingCompleteHeader =
    response.headers.get("X-Onboarding-Complete");
  const onboardingComplete = onboardingCompleteHeader === "true";

  const userData = await response.json();

  // Return user data with onboarding status from header (more reliable than body)
  return {
    ...userData,
    onboardingComplete,
  };
}

