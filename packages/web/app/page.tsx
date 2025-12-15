import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { LandingPage } from "@/components/landing/landing-page";

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

export default async function Home() {
  const headersList = await headers();
  const cookieStore = await cookies();
  const hostname = headersList.get("host") || "";
  const accessToken = cookieStore.get("accessToken")?.value;

  const subdomain = extractSubdomain(hostname);
  const isMainDomain = subdomain === null;

  // On subdomains, never show landing page
  // Redirect authenticated users to dashboard, unauthenticated to login
  if (!isMainDomain) {
    if (accessToken) {
      redirect("/dashboard/overview");
    } else {
      redirect("/login");
    }
  }

  return <LandingPage />;
}
