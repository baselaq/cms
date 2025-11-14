import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosError,
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
        // Get token from storage if available
        if (this.tokenStorage) {
          const token = await this.tokenStorage.getAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
    } else {
      delete this.instance.defaults.headers.common["Authorization"];
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
    }
  }

  async clearTokens(): Promise<void> {
    if (this.tokenStorage) {
      await this.tokenStorage.clearTokens();
    }
    this.setAuthToken(null);
  }
}
