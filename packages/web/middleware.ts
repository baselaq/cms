import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Extract subdomain from hostname (server-side)
 */
function extractSubdomain(hostname: string): string | null {
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "cms.test";

  // Remove port from hostname (e.g., "cms.test:3001" -> "cms.test")
  const hostnameWithoutPort = hostname.split(":")[0];

  // Handle app domain subdomains (e.g., example.cms.test)
  if (
    hostnameWithoutPort.endsWith(`.${appDomain}`) ||
    hostnameWithoutPort === appDomain
  ) {
    if (hostnameWithoutPort === appDomain) {
      // Main domain, no subdomain
      return null;
    }
    const parts = hostnameWithoutPort.split(".");
    const domainParts = appDomain.split(".");
    const domainLength = domainParts.length;
    // Remove the domain parts from the end
    return parts.slice(0, -domainLength).join(".");
  }

  // Handle localhost subdomains (e.g., club1.localhost)
  if (hostnameWithoutPort.includes("localhost")) {
    const hostParts = hostnameWithoutPort.split(".");
    if (hostParts.length >= 2 && hostParts[1].includes("localhost")) {
      return hostParts[0];
    }
  }

  // Handle other domains (e.g., subdomain.example.com)
  const hostParts = hostnameWithoutPort.split(".");
  if (hostParts.length >= 3) {
    return hostParts[0] === "www" ? hostParts[1] : hostParts[0];
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken")?.value;
  const hostname = request.headers.get("host") || "";

  // Extract subdomain to determine if we're on main domain or subdomain
  const subdomain = extractSubdomain(hostname);
  const isMainDomain = subdomain === null;

  // Debug logging in development
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[Middleware] hostname: ${hostname}, subdomain: ${subdomain}, isMainDomain: ${isMainDomain}, pathname: ${pathname}`
    );
  }

  // Protected routes that require authentication
  // On main domain, "/" is the landing page (public)
  // On subdomains, "/" should redirect to dashboard or login
  const protectedRoutes = isMainDomain
    ? ["/dashboard", "/content"] // Main domain: only protect dashboard/content
    : ["/", "/dashboard", "/content"]; // Subdomain: protect everything including "/"
  const authRoutes = ["/login", "/signup", "/register"];

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isAuthRoute = authRoutes.includes(pathname);

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // On main domain, redirect login back to landing page
  // Login should only be accessible on subdomains
  // But allow /register on main domain for new club registration
  if (isMainDomain && pathname === "/login") {
    const landingUrl = new URL("/", request.url);
    return NextResponse.redirect(landingUrl);
  }

  // Allow /onboarding route even when authenticated (user might need to complete it)
  if (pathname === "/onboarding") {
    return NextResponse.next();
  }

  // Check onboarding status for authenticated users on subdomains
  // This is a server-side check to force redirect users who haven't completed onboarding
  if (!isMainDomain && accessToken && isProtectedRoute) {
    try {
      // Check onboarding status by calling /auth/me endpoint
      const backendUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        `http://${process.env.NEXT_PUBLIC_APP_DOMAIN || "cms.test"}:${
          process.env.NEXT_PUBLIC_BACKEND_PORT || "3000"
        }`;

      const response = await fetch(`${backendUrl}/api/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Tenant-Subdomain": subdomain || "",
        },
        cache: "no-store",
      });

      if (response.ok) {
        // Check onboarding status from response header
        const onboardingCompleteHeader = response.headers.get(
          "X-Onboarding-Complete"
        );
        const onboardingComplete = onboardingCompleteHeader === "true";

        // If onboarding is not complete, redirect to onboarding page
        if (!onboardingComplete && pathname !== "/onboarding") {
          const onboardingUrl = new URL("/onboarding", request.url);
          return NextResponse.redirect(onboardingUrl);
        }
      }
    } catch (error) {
      // If we can't check onboarding status, continue to allow access
      // This prevents blocking users if the API is temporarily unavailable
      if (process.env.NODE_ENV === "development") {
        console.warn("[Middleware] Failed to check onboarding status:", error);
      }
    }
  }

  // Redirect authenticated users away from auth routes (on subdomains)
  if (isAuthRoute && accessToken) {
    // Check if onboarding is complete before redirecting to dashboard
    // If not complete, redirect to onboarding instead
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        `http://${process.env.NEXT_PUBLIC_APP_DOMAIN || "cms.test"}:${
          process.env.NEXT_PUBLIC_BACKEND_PORT || "3000"
        }`;

      const response = await fetch(`${backendUrl}/api/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Tenant-Subdomain": subdomain || "",
        },
        cache: "no-store",
      });

      if (response.ok) {
        const onboardingCompleteHeader = response.headers.get(
          "X-Onboarding-Complete"
        );
        const onboardingComplete = onboardingCompleteHeader === "true";

        if (!onboardingComplete) {
          const onboardingUrl = new URL("/onboarding", request.url);
          return NextResponse.redirect(onboardingUrl);
        }
      }
    } catch (error) {
      // Fallback to dashboard redirect if check fails
      if (process.env.NODE_ENV === "development") {
        console.warn("[Middleware] Failed to check onboarding status:", error);
      }
    }

    const dashboardUrl = new URL("/dashboard/overview", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // On main domain, if user is authenticated and tries to access "/", redirect to dashboard
  if (isMainDomain && pathname === "/" && accessToken) {
    const dashboardUrl = new URL("/dashboard/overview", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // On subdomain, if user is authenticated and tries to access "/", redirect to dashboard
  // (landing page should never show on subdomains for logged-in users)
  if (!isMainDomain && pathname === "/" && accessToken) {
    const dashboardUrl = new URL("/dashboard/overview", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // On subdomain, if no subdomain route matches, redirect to dashboard or login
  // This ensures the landing page never shows on subdomains
  if (!isMainDomain && pathname === "/" && !accessToken) {
    // This case is already handled by the protectedRoutes check above
    // which redirects to /login
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
