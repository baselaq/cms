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
  // This MUST be added before other interceptors to ensure header is set early
  if (getSubdomain) {
    // Use request interceptor with high priority (runs first)
    axiosInstance.interceptors.request.use(
      (config) => {
        const subdomain = getSubdomain();
        if (subdomain && config.headers) {
          // Ensure headers object exists
          if (!config.headers) {
            config.headers = {} as AxiosRequestHeaders;
          }
          config.headers["X-Tenant-Subdomain"] = subdomain;
          if (process.env.NODE_ENV === "development") {
            console.log(
              `🔗 [http-client] Adding X-Tenant-Subdomain header: ${subdomain}`
            );
            console.log(
              `🔗 [http-client] Current hostname: ${
                typeof window !== "undefined" ? window.location.hostname : "SSR"
              }`
            );
            console.log(
              `🔗 [http-client] Request URL: ${config.baseURL}${config.url}`
            );
            console.log(
              `🔗 [http-client] Full request config:`,
              JSON.stringify(
                {
                  baseURL: config.baseURL,
                  url: config.url,
                  method: config.method,
                  headers: {
                    "X-Tenant-Subdomain": config.headers["X-Tenant-Subdomain"],
                    "Content-Type": config.headers["Content-Type"],
                  },
                },
                null,
                2
              )
            );
          }
        } else {
          if (process.env.NODE_ENV === "development") {
            console.error(
              `❌ [http-client] No subdomain extracted from hostname: ${
                typeof window !== "undefined" ? window.location.hostname : "SSR"
              }`
            );
            console.error(
              `❌ [http-client] Request will fail without subdomain header!`
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
