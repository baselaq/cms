import { HttpClient, IHttpClientConfig } from "./http-client";
import type { ITokenStorage } from "./token-storage";
import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosRequestHeaders,
  AxiosResponse,
} from "axios";

export interface IHttpClientInitOptions {
  baseURL?: string;
  timeout?: number;
  tokenStorage: ITokenStorage;
  refreshTokenEndpoint?: string;
  onError?: (error: AxiosError) => void;
  /**
   * Optional function to extract subdomain from hostname
   * Used for web platform to pass tenant subdomain to backend
   */
  getSubdomain?: () => string | null;
  /**
   * Optional callback for onboarding redirect
   * Called when X-Onboarding-Complete header is false
   */
  onOnboardingIncomplete?: () => void;
}

/**
 * Initialize HTTP client with platform-specific configuration
 * This is the main entry point for both web and mobile
 * Automatically detects environment and uses appropriate env vars
 */
export function initializeHttpClient(options: IHttpClientInitOptions) {
  // Get baseURL from environment variables only (static configuration)
  // Web: NEXT_PUBLIC_API_URL, Mobile: EXPO_PUBLIC_API_URL
  const getDefaultBaseURL = () => {
    if (typeof window !== "undefined") {
      // Web platform - Next.js
      return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    }
    // Mobile platform - Expo
    return process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
  };

  const {
    baseURL = getDefaultBaseURL(),
    timeout = 10000,
    tokenStorage,
    refreshTokenEndpoint = "/auth/refresh",
    onError,
    getSubdomain,
    onOnboardingIncomplete,
  } = options;

  const config: IHttpClientConfig = {
    baseURL,
    timeout,
    tokenStorage,
    refreshTokenEndpoint,
    onError,
    onOnboardingIncomplete,
  };

  const httpClient = new HttpClient(config);
  const axiosInstance = httpClient.getAxiosInstance();

  // Add subdomain header interceptor if getSubdomain is provided (web platform)
  // This MUST be added before other interceptors to ensure header is set early
  // All requests go to main domain (cms.test:3000), and tenant is identified via X-Tenant-Subdomain header
  if (getSubdomain) {
    // Use request interceptor with high priority (runs first)
    axiosInstance.interceptors.request.use(
      (config) => {
        const subdomain = getSubdomain();

        // Ensure headers object exists
        if (!config.headers) {
          config.headers = {} as AxiosRequestHeaders;
        }

        // Always set X-Tenant-Subdomain header if subdomain exists
        // Backend uses this header to route to the correct tenant database
        // All requests go to main domain (cms.test:3000), not subdomain URLs
        if (subdomain) {
          config.headers["X-Tenant-Subdomain"] = subdomain;

          if (process.env.NODE_ENV === "development") {
            const currentHostname =
              typeof window !== "undefined" ? window.location.hostname : "SSR";
            console.log(
              `🔗 [http-client] Adding X-Tenant-Subdomain header: ${subdomain}`
            );
            console.log(
              `🔗 [http-client] Current hostname: ${currentHostname}`
            );
            console.log(
              `🔗 [http-client] Base URL (main domain): ${config.baseURL}`
            );
            console.log(
              `🔗 [http-client] Request URL: ${config.baseURL}${config.url}`
            );
          }
        } else {
          // No subdomain - this is expected on main domain (cms.test)
          // Guest-level endpoints (like /api/clubs/by-slug) don't need tenant header
          if (process.env.NODE_ENV === "development") {
            const currentHostname =
              typeof window !== "undefined" ? window.location.hostname : "SSR";
            console.log(
              `ℹ️ [http-client] No subdomain (main domain): ${currentHostname} - request to main domain without tenant header`
            );
            console.log(
              `ℹ️ [http-client] Request URL: ${config.baseURL}${config.url}`
            );
          }
        }
        return config;
      },
      (error) => Promise.reject(error),
      { synchronous: false, runWhen: () => true }
    );
  }

  // Create and return HTTP methods (inline to avoid extra file)
  return {
    httpClient,
    get: <T = unknown>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> => httpClient.get<T>(url, config),
    post: <T = unknown>(
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> => httpClient.post<T>(url, data, config),
    put: <T = unknown>(
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> => httpClient.put<T>(url, data, config),
    patch: <T = unknown>(
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> => httpClient.patch<T>(url, data, config),
    delete: <T = unknown>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> => httpClient.delete<T>(url, config),
  };
}
