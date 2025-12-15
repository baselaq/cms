"use client";

import { initializeHttpClient } from "@cms/shared";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { WebTokenStorage } from "./token-storage-web";
import { extractSubdomainFromHostname } from "./tenant-utils";
import { getBackendUrl } from "./app-config";

// Global error handler for 401/403
let globalErrorHandler: ((error: AxiosError) => void) | null = null;
// Global onboarding redirect handler
let globalOnboardingRedirect: (() => void) | null = null;

export function setGlobalErrorHandler(handler: (error: AxiosError) => void) {
  globalErrorHandler = handler;
}

export function setGlobalOnboardingRedirect(handler: () => void) {
  globalOnboardingRedirect = handler;
}

// Create onboarding redirect handler that works in client components
function createOnboardingRedirectHandler() {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return undefined;
  }

  return () => {
    // Check current pathname to avoid redirect loops
    const currentPath = window.location.pathname;
    const excludedPaths = [
      "/onboarding",
      "/register",
      "/login",
      "/forgot-password",
      "/reset-password",
    ];

    if (excludedPaths.some((path) => currentPath.startsWith(path))) {
      return;
    }

    // Use global redirect handler if set, otherwise use window.location
    if (globalOnboardingRedirect) {
      globalOnboardingRedirect();
    } else {
      // Fallback to window.location for SSR compatibility
      window.location.href = "/onboarding";
    }
  };
}

// Initialize HTTP client with web-specific configuration
// BaseURL is read from NEXT_PUBLIC_API_URL or uses app config
const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || getBackendUrl();

// Log the baseURL in development to help debug
if (process.env.NODE_ENV === "development") {
  console.log(`🌐 [http-client] API Base URL: ${apiBaseURL}`);
  console.log(
    `🌐 [http-client] Current hostname: ${
      typeof window !== "undefined" ? window.location.hostname : "SSR"
    }`
  );
}

const httpClientInit = initializeHttpClient({
  baseURL: apiBaseURL,
  tokenStorage: new WebTokenStorage(),
  refreshTokenEndpoint: "/auth/refresh",
  getSubdomain: extractSubdomainFromHostname,
  onError: (error: AxiosError) => {
    // Handle 401/403 errors globally
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (globalErrorHandler) {
        globalErrorHandler(error);
      }
    }
  },
  onOnboardingIncomplete: createOnboardingRedirectHandler(),
});

export const {
  httpClient,
  get,
  post,
  put,
  patch,
  delete: del,
} = httpClientInit;
