import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Extract subdomain from hostname
 */
function extractSubdomain(hostname: string): string | null {
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "cms.test";
  const hostnameWithoutPort = hostname.split(":")[0];

  // Handle app domain subdomains (e.g., example.cms.test)
  if (hostnameWithoutPort.endsWith(`.${appDomain}`)) {
    const parts = hostnameWithoutPort.split(".");
    const domainParts = appDomain.split(".");
    return parts.slice(0, -domainParts.length).join(".");
  }

  // Main domain (no subdomain)
  if (hostnameWithoutPort === appDomain) {
    return null;
  }

  // Handle localhost subdomains (e.g., club1.localhost)
  if (hostnameWithoutPort.includes("localhost")) {
    const parts = hostnameWithoutPort.split(".");
    if (parts.length >= 2 && parts[1].includes("localhost")) {
      return parts[0];
    }
  }

  return null;
}

/**
 * Check if onboarding is complete by calling the backend API
 */
async function checkOnboardingComplete(
  accessToken: string,
  subdomain: string
): Promise<boolean | null> {
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      `http://${process.env.NEXT_PUBLIC_APP_DOMAIN || "cms.test"}:${
        process.env.NEXT_PUBLIC_BACKEND_PORT || "3000"
      }`;

    console.log("backendUrl", backendUrl);
    const response = await fetch(`${backendUrl}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Tenant-Subdomain": subdomain,
      },
      cache: "no-store",
    });

    // console.log("response onboarding complete", response);

    if (response.ok) {
      const header = response.headers.get("X-Onboarding-Complete");
      console.log("headers onboarding complete", header);
      return header === "true";
    }
    return null; // API error
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Middleware] Failed to check onboarding status:", error);
    }
    return null; // Network error
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken")?.value;
  const hostname = request.headers.get("host") || "";
  const subdomain = extractSubdomain(hostname);
  const isMainDomain = subdomain === null;

  // Debug logging
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[Middleware] ${hostname} | subdomain: ${subdomain} | path: ${pathname}`
    );
  }

  // Route categories
  const authRoutes = ["/login", "/signup", "/register"];
  const isAuthRoute = authRoutes.includes(pathname);
  const isOnboardingRoute = pathname === "/onboarding";
  const isProtectedRoute = isMainDomain
    ? pathname.startsWith("/dashboard") || pathname.startsWith("/content")
    : pathname === "/" ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/content");

  // --- UNAUTHENTICATED USERS ---
  if (!accessToken) {
    // Redirect from protected routes to login
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // --- AUTHENTICATED USERS (has accessToken) ---

  // Main domain: redirect /login to landing, authenticated "/" to dashboard
  if (isMainDomain) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard/overview", request.url));
    }
    return NextResponse.next();
  }

  // --- SUBDOMAIN AUTHENTICATED USERS ---

  // Check onboarding status
  const onboardingComplete = await checkOnboardingComplete(
    accessToken,
    subdomain!
  );

  // If API failed, allow access (don't block user)
  if (onboardingComplete === null) {
    return NextResponse.next();
  }

  // Onboarding NOT complete
  if (!onboardingComplete) {
    // Already on onboarding page - allow
    if (isOnboardingRoute) {
      return NextResponse.next();
    }
    // Redirect everything else to onboarding
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Onboarding IS complete
  if (onboardingComplete) {
    // On onboarding page - redirect to dashboard
    if (isOnboardingRoute) {
      return NextResponse.redirect(new URL("/dashboard/overview", request.url));
    }
    // On auth routes - redirect to dashboard
    if (isAuthRoute) {
      return NextResponse.redirect(new URL("/dashboard/overview", request.url));
    }
    // On root "/" - redirect to dashboard
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard/overview", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
