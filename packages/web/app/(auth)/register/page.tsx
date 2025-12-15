import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { RegistrationForm } from "@/components/registration-form";
import { EndUserRegistrationForm } from "@/components/end-user-registration-form";
import { autoLoginWithOnboardingToken } from "./actions";
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

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { slug?: string; token?: string };
}) {
  const cookieStore = await cookies();
  const headersList = await headers();
  const accessToken = cookieStore.get("accessToken")?.value;
  const hostname = headersList.get("host") || "";

  // Check if we're on main domain (no subdomain)
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "cms.test";
  const hostnameWithoutPort = hostname.split(":")[0];
  const isMainDomain =
    hostnameWithoutPort === appDomain ||
    hostnameWithoutPort === "localhost" ||
    hostnameWithoutPort === "127.0.0.1";

  // Redirect authenticated users - check onboarding status first (SSR)
  if (accessToken) {
    const subdomain = extractSubdomain(hostname);

    if (subdomain) {
      try {
        // Check onboarding status via SSR
        const user = await getMeServer(accessToken, subdomain);

        // Redirect based on onboarding status
        if (!user.onboardingComplete) {
          redirect("/onboarding");
        } else {
          redirect("/dashboard/overview");
        }
      } catch (error) {
        // If we can't verify onboarding status, redirect to dashboard
        // Middleware will catch and redirect if needed
        console.warn(
          "Failed to check onboarding status in register page:",
          error
        );
        redirect("/dashboard/overview");
      }
    } else {
      // No subdomain detected, redirect to dashboard
      redirect("/dashboard/overview");
    }
  }

  // On subdomain: handle auto-login with onboarding token (SSR)
  if (!isMainDomain && searchParams.token) {
    const subdomain = extractSubdomain(hostname);
    if (subdomain) {
      // Auto-login with onboarding token server-side
      await autoLoginWithOnboardingToken(searchParams.token, subdomain);
      // Redirect happens in the action
    }
  }

  // On main domain: show club registration form
  // On subdomain: show end user registration form
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        {isMainDomain ? (
          <RegistrationForm initialSlug={searchParams.slug} />
        ) : (
          <EndUserRegistrationForm />
        )}
      </div>
    </div>
  );
}
