import { HttpClient, IHttpClientConfig } from "./http-client";
import type { ITokenStorage } from "./token-storage";
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

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
}

/**
 * Initialize HTTP client with platform-specific configuration
 * This is the main entry point for both web and mobile
 * Automatically detects environment and uses appropriate env vars
 */
export function initializeHttpClient(options: IHttpClientInitOptions) {
  // Auto-detect baseURL from environment
  // Web: NEXT_PUBLIC_API_URL, Mobile: EXPO_PUBLIC_API_URL
  const getDefaultBaseURL = () => {
    if (typeof window !== "undefined") {
      // Web platform - Next.js
      return "http://club1.localhost:3000";
    }
    // Mobile platform - Expo
    return "http://club1.localhost:3000";
  };

  const {
    baseURL = getDefaultBaseURL(),
    timeout = 10000,
    tokenStorage,
    refreshTokenEndpoint = "/auth/refresh",
    onError,
    getSubdomain,
  } = options;

  const config: IHttpClientConfig = {
    baseURL,
    timeout,
    tokenStorage,
    refreshTokenEndpoint,
    onError,
  };

  const httpClient = new HttpClient(config);
  const axiosInstance = httpClient.getAxiosInstance();

  // Add subdomain header interceptor if getSubdomain is provided (web platform)
  if (getSubdomain) {
    axiosInstance.interceptors.request.use(
      (config) => {
        const subdomain = getSubdomain();
        if (subdomain && config.headers) {
          config.headers["X-Tenant-Subdomain"] = subdomain;
        }
        return config;
      },
      (error) => Promise.reject(error)
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
