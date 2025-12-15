import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getMeServer } from "@/lib/auth-api-server";

/**
 * Extract subdomain from hostname (server-side)
 */
function extractSubdomain(hostname: string): string | null {
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "cms.test";
  const hostnameWithoutPort = hostname.split(":")[0];

  if (
    hostnameWithoutPort.endsWith(`.${appDomain}`) ||
    hostnameWithoutPort === appDomain
  ) {
    if (hostnameWithoutPort === appDomain) {
      return null;
    }
    const parts = hostnameWithoutPort.split(".");
    const domainParts = appDomain.split(".");
    const domainLength = domainParts.length;
    return parts.slice(0, -domainLength).join(".");
  }

  if (hostnameWithoutPort.includes("localhost")) {
    const hostParts = hostnameWithoutPort.split(".");
    if (hostParts.length >= 2 && hostParts[1].includes("localhost")) {
      return hostParts[0];
    }
  }

  return null;
}

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const headersList = await headers();
  const accessToken = cookieStore.get("accessToken")?.value;
  const hostname = headersList.get("host") || "";

  // Check if we're on a subdomain (tenant)
  const subdomain = extractSubdomain(hostname);

  // If not on a subdomain, redirect to main domain
  if (!subdomain) {
    redirect("/register");
  }

  // If not authenticated, redirect to login
  if (!accessToken) {
    redirect("/login");
  }

  // Check onboarding status server-side
  try {
    const user = await getMeServer(accessToken, subdomain);

    console.log("user", user);

    // If onboarding is already complete, redirect to dashboard
    if (user.onboardingComplete) {
      redirect("/dashboard/overview");
    }
  } catch (error) {
    // If we can't verify onboarding status, let the client component handle it
    console.warn("Failed to check onboarding status server-side:", error);
  }

  // The OnboardingWizard component will handle client-side state (sessionStorage)
  return <OnboardingWizard />;
}
