/**
 * Platform-agnostic token storage interface
 */
export interface ITokenStorage {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  setAccessToken(token: string): Promise<void>;
  setRefreshToken(token: string): Promise<void>;
  clearTokens(): Promise<void>;
}
