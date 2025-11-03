"use client";

import { initializeHttpClient } from "@cms/shared";
import { AxiosError } from "axios";
import { WebTokenStorage } from "./token-storage-web";
import { extractSubdomainFromHostname } from "./tenant-utils";

// Global error handler for 401/403
let globalErrorHandler: ((error: AxiosError) => void) | null = null;

export function setGlobalErrorHandler(handler: (error: AxiosError) => void) {
  globalErrorHandler = handler;
}

// Initialize HTTP client with web-specific configuration
const httpClientInit = initializeHttpClient({
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
});

export const {
  httpClient,
  get,
  post,
  put,
  patch,
  delete: del,
} = httpClientInit;
