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
    return Cookies.get(this.ACCESS_TOKEN_KEY) || null;
  }

  async getRefreshToken(): Promise<string | null> {
    return Cookies.get(this.REFRESH_TOKEN_KEY) || null;
  }

  async setAccessToken(token: string): Promise<void> {
    Cookies.set(this.ACCESS_TOKEN_KEY, token, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }

  async setRefreshToken(token: string): Promise<void> {
    Cookies.set(this.REFRESH_TOKEN_KEY, token, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }

  async clearTokens(): Promise<void> {
    Cookies.remove(this.ACCESS_TOKEN_KEY);
    Cookies.remove(this.REFRESH_TOKEN_KEY);
  }
}
