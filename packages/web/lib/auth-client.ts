import type { IMeResponse } from "@cms/shared";
import { get } from "@/lib/http-client";

/**
 * Get current authenticated user with roles and permissions
 * Uses the shared axios instance which automatically:
 * - Adds Authorization header from token storage
 * - Handles token refresh on 401 errors
 * - Adds tenant subdomain header via interceptor
 */
export async function getMe(): Promise<IMeResponse> {
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 [auth-client] Calling /auth/me endpoint");
  }

  try {
    const response = await get<IMeResponse>("/auth/me");
    if (process.env.NODE_ENV === "development") {
      console.log("✅ [auth-client] /auth/me succeeded");
    }
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("❌ [auth-client] /auth/me failed:", error);
      if (error instanceof Error) {
        console.error("❌ [auth-client] Error message:", error.message);
      }
    }
    throw error;
  }
}
