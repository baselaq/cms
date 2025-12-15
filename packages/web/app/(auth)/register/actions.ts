"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Server action to auto-login admin using onboarding token
 * Called when user lands on register page with onboarding token
 */
export async function autoLoginWithOnboardingToken(
  onboardingToken: string,
  subdomain: string
) {
  try {
    // Get admin credentials from the onboarding token
    // We'll need to create an API endpoint that returns admin credentials for a token
    // For now, we'll use the onboarding token to authenticate directly

    // Create login request using the onboarding token
    // This requires creating an endpoint that accepts onboarding token and returns auth tokens
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      `http://${process.env.NEXT_PUBLIC_APP_DOMAIN || "cms.test"}:${
        process.env.NEXT_PUBLIC_BACKEND_PORT || "3000"
      }`;

    // Call backend to auto-login with onboarding token
    const response = await fetch(
      `${backendUrl}/api/auth/login-with-onboarding-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Subdomain": subdomain,
        },
        body: JSON.stringify({ onboardingToken }),
      }
    );

    if (!response.ok) {
      // If auto-login fails, let user register manually
      return { success: false };
    }

    const data = await response.json();

    // Set auth cookies
    const cookieStore = await cookies();
    cookieStore.set("accessToken", data.accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    cookieStore.set("refreshToken", data.refreshToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Redirect based on onboarding status
    if (!data.user.onboardingComplete) {
      redirect("/onboarding");
    } else {
      redirect("/dashboard/overview");
    }
  } catch (error) {
    console.error("Auto-login failed:", error);
    return { success: false };
  }
}
