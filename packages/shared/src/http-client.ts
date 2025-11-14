import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosError,
  AxiosRequestHeaders,
} from "axios";
import type { ITokenStorage } from "./token-storage";

export interface IHttpClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  tokenStorage?: ITokenStorage;
  refreshTokenEndpoint?: string;
  onError?: (error: AxiosError) => void;
}

export type TRefreshTokenHandler = () => Promise<string | null>;

export class HttpClient {
  private instance: AxiosInstance;
  private refreshTokenHandler?: TRefreshTokenHandler;
  private tokenStorage?: ITokenStorage;
  private refreshTokenEndpoint?: string;
  private onError?: (error: AxiosError) => void;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];

  constructor(config: IHttpClientConfig) {
    this.instance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
    });

    this.tokenStorage = config.tokenStorage;
    this.refreshTokenEndpoint = config.refreshTokenEndpoint;
    this.onError = config.onError;

    this.setupInterceptors();
    this.loadInitialToken();
  }

  private async loadInitialToken() {
    if (this.tokenStorage) {
      const token = await this.tokenStorage.getAccessToken();
      if (token) {
        this.setAuthToken(token);
      }
    }
  }

  private setupInterceptors() {
    // Request interceptor for adding auth token
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Ensure headers object exists
        if (!config.headers) {
          config.headers = {} as AxiosRequestHeaders;
        }

        // Get token from storage if available
        if (this.tokenStorage) {
          try {
            const token = await this.tokenStorage.getAccessToken();
            if (token) {
              // Ensure Authorization header is set correctly
              config.headers.Authorization = `Bearer ${token}`;
              if (process.env.NODE_ENV === "development") {
                if (config.url?.includes("/auth/me")) {
                  console.log(
                    "✅ [http-client] Adding token to /auth/me request"
                  );
                  console.log(
                    "✅ [http-client] Token preview:",
                    token.substring(0, 30) + "..."
                  );
                  console.log("✅ [http-client] Token length:", token.length);
                  console.log(
                    "✅ [http-client] Full URL:",
                    `${config.baseURL}${config.url}`
                  );
                  console.log(
                    "✅ [http-client] Authorization header value:",
                    config.headers.Authorization
                      ? config.headers.Authorization.substring(0, 50) + "..."
                      : "MISSING"
                  );
                  // Verify header is actually set
                  if (
                    !config.headers.Authorization ||
                    !config.headers.Authorization.startsWith("Bearer ")
                  ) {
                    console.error(
                      "❌ [http-client] Authorization header not set correctly!"
                    );
                    console.error(
                      "❌ [http-client] Headers object:",
                      Object.keys(config.headers || {})
                    );
                  }
                }
                console.log(
                  `🔑 [http-client] Request to ${
                    config.url
                  }: Authorization header ${
                    config.headers.Authorization ? "SET" : "MISSING"
                  }`
                );
              }
            } else {
              if (process.env.NODE_ENV === "development") {
                if (config.url?.includes("/auth/me")) {
                  console.error(
                    "❌ [http-client] No access token found in storage for /auth/me request"
                  );
                  console.error("❌ [http-client] URL:", config.url);
                  console.error("❌ [http-client] Base URL:", config.baseURL);
                  console.error(
                    "❌ [http-client] Full URL would be:",
                    `${config.baseURL}${config.url}`
                  );
                }
                console.warn(
                  `⚠️ [http-client] Request to ${config.url}: No token in storage`
                );
              }
            }
          } catch (error) {
            if (process.env.NODE_ENV === "development") {
              console.error(
                "❌ [http-client] Error getting token from storage:",
                error
              );
            }
          }
        } else {
          if (process.env.NODE_ENV === "development") {
            console.error("❌ [http-client] No tokenStorage configured!");
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh and error handling
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        // Call global error handler if provided
        if (this.onError && error.response) {
          this.onError(error);
        }

        // Handle 401/403 errors with token refresh
        if (
          (error.response?.status === 401 || error.response?.status === 403) &&
          !originalRequest._retry &&
          (this.refreshTokenHandler || this.refreshTokenEndpoint)
        ) {
          if (this.isRefreshing) {
            // Queue requests while refreshing
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return this.instance(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            let newToken: string | null = null;

            if (this.refreshTokenHandler) {
              newToken = await this.refreshTokenHandler();
            } else if (this.refreshTokenEndpoint && this.tokenStorage) {
              // Auto-refresh using token storage
              const refreshToken = await this.tokenStorage.getRefreshToken();
              if (refreshToken) {
                try {
                  const response = await this.instance.post<{
                    accessToken: string;
                    refreshToken?: string;
                  }>(this.refreshTokenEndpoint, { refreshToken });

                  if (response.data.accessToken) {
                    newToken = response.data.accessToken;
                    await this.tokenStorage.setAccessToken(newToken);
                    if (response.data.refreshToken) {
                      await this.tokenStorage.setRefreshToken(
                        response.data.refreshToken
                      );
                    }
                  }
                } catch (refreshError) {
                  // Refresh failed, clear tokens
                  await this.tokenStorage.clearTokens();
                  this.processQueue(refreshError, null);
                  return Promise.reject(refreshError);
                }
              }
            }

            if (newToken) {
              this.processQueue(null, newToken);
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              return this.instance(originalRequest);
            }
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  setRefreshTokenHandler(handler: TRefreshTokenHandler) {
    this.refreshTokenHandler = handler;
  }

  setAuthToken(token: string | null) {
    if (token) {
      this.instance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;
      if (process.env.NODE_ENV === "development") {
        console.log("🔑 [http-client] Token set on axios defaults");
      }
    } else {
      delete this.instance.defaults.headers.common["Authorization"];
      if (process.env.NODE_ENV === "development") {
        console.log("🔑 [http-client] Token removed from axios defaults");
      }
    }
  }

  // HTTP Methods
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.patch<T>(url, data, config);
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }

  getAxiosInstance(): AxiosInstance {
    return this.instance;
  }

  // Token management methods
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    if (this.tokenStorage) {
      await this.tokenStorage.setAccessToken(accessToken);
      await this.tokenStorage.setRefreshToken(refreshToken);
      this.setAuthToken(accessToken);
      if (process.env.NODE_ENV === "development") {
        console.log("✅ [http-client] Tokens saved successfully");
        console.log(
          "✅ [http-client] Access token preview:",
          accessToken.substring(0, 30) + "..."
        );
        // Wait a bit longer for cookie to be fully set
        await new Promise((resolve) => setTimeout(resolve, 50));
        // Verify token was stored
        const storedToken = await this.tokenStorage.getAccessToken();
        console.log(
          "✅ [http-client] Token verification:",
          storedToken ? "FOUND" : "NOT FOUND"
        );
        if (storedToken) {
          console.log(
            "✅ [http-client] Stored token preview:",
            storedToken.substring(0, 30) + "..."
          );
          // Verify tokens match
          if (storedToken === accessToken) {
            console.log("✅ [http-client] Token matches saved token");
          } else {
            console.error(
              "❌ [http-client] Token mismatch! Saved token differs from retrieved token"
            );
          }
        } else {
          console.error("❌ [http-client] Token was NOT found after saving!");
        }
      }
    } else {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "❌ [http-client] Cannot save tokens: no tokenStorage configured"
        );
      }
    }
  }

  async clearTokens(): Promise<void> {
    if (this.tokenStorage) {
      await this.tokenStorage.clearTokens();
    }
    this.setAuthToken(null);
  }
}
