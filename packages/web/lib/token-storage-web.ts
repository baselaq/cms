"use client";

import Cookies from "js-cookie";
import type { ITokenStorage } from "@cms/shared";

/**
 * Web implementation of token storage using cookies
 * Note: HTTP-only cookies are managed by the server,
 * but we use js-cookie for client-side token management
 */
export class WebTokenStorage implements ITokenStorage {
  private readonly ACCESS_TOKEN_KEY = "accessToken";
  private readonly REFRESH_TOKEN_KEY = "refreshToken";

  async getAccessToken(): Promise<string | null> {
    const token = Cookies.get(this.ACCESS_TOKEN_KEY);
    if (process.env.NODE_ENV === "development") {
      if (!token) {
        console.warn("⚠️ [WebTokenStorage] No access token found in cookies");
        const allCookies = Cookies.get();
        console.warn(
          "⚠️ [WebTokenStorage] All cookies:",
          allCookies ? Object.keys(allCookies) : "none"
        );
      } else {
        console.debug(
          "✅ [WebTokenStorage] Token found:",
          token.substring(0, 20) + "..."
        );
      }
    }
    return token || null;
  }

  async getRefreshToken(): Promise<string | null> {
    return Cookies.get(this.REFRESH_TOKEN_KEY) || null;
  }

  async setAccessToken(token: string): Promise<void> {
    const cookieOptions: Cookies.CookieAttributes = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/", // Ensure cookie is accessible across all routes
      // Don't set domain for localhost - browsers handle localhost cookies specially
      // Setting domain: ".localhost" can cause cookies to not be readable
    };

    Cookies.set(this.ACCESS_TOKEN_KEY, token, cookieOptions);

    if (process.env.NODE_ENV === "development") {
      console.log("✅ [WebTokenStorage] Access token saved to cookies");
      // Wait a bit for cookie to be set, then verify
      await new Promise((resolve) => setTimeout(resolve, 10));
      const saved = Cookies.get(this.ACCESS_TOKEN_KEY);
      console.log(
        "✅ [WebTokenStorage] Token verification:",
        saved ? "SUCCESS" : "FAILED"
      );
      if (!saved) {
        console.warn(
          "⚠️ [WebTokenStorage] Cookie not readable immediately after setting"
        );
        console.warn(
          "⚠️ [WebTokenStorage] This might be a domain/subdomain issue"
        );
        // Try reading all cookies to debug
        const allCookies = Cookies.get();
        console.warn(
          "⚠️ [WebTokenStorage] All available cookies:",
          allCookies ? Object.keys(allCookies) : "none"
        );
      }
    }
  }

  async setRefreshToken(token: string): Promise<void> {
    const cookieOptions: Cookies.CookieAttributes = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/", // Ensure cookie is accessible across all routes
      // Don't set domain for localhost - browsers handle localhost cookies specially
    };

    Cookies.set(this.REFRESH_TOKEN_KEY, token, cookieOptions);
  }

  async clearTokens(): Promise<void> {
    // Remove cookies with explicit path to match how they were set
    Cookies.remove(this.ACCESS_TOKEN_KEY, { path: "/" });
    Cookies.remove(this.REFRESH_TOKEN_KEY, { path: "/" });
    // Also try without path as fallback
    Cookies.remove(this.ACCESS_TOKEN_KEY);
    Cookies.remove(this.REFRESH_TOKEN_KEY);
  }
}
