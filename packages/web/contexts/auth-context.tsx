"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { httpClient } from "@/lib/http-client";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const checkAuth = React.useCallback(async () => {
    try {
      // Check if access token exists in cookies
      const accessToken = Cookies.get("accessToken");

      if (accessToken) {
        // Token exists - assume authenticated
        // Token validity will be checked on actual API calls via interceptors
        setIsAuthenticated(true);
        return true;
      }

      // No token found
      setIsAuthenticated(false);
      return false;
    } catch {
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  const logout = React.useCallback(async () => {
    try {
      // Clear tokens from storage
      await httpClient.clearTokens();
      // Clear auth state
      setIsAuthenticated(false);
      // Redirect to login
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear state and redirect even if clearTokens fails
      setIsAuthenticated(false);
      router.push("/login");
      router.refresh();
    }
  }, [router]);

  React.useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await checkAuth();
      setIsLoading(false);
    };

    initAuth();
  }, [checkAuth]);

  // Protected routes that require authentication
  const protectedRoutes = ["/"];
  const authRoutes = ["/login", "/signup", "/register"];

  React.useEffect(() => {
    if (isLoading) return;

    const isProtectedRoute = protectedRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );
    const isAuthRoute = authRoutes.includes(pathname);

    if (isProtectedRoute && !isAuthenticated) {
      router.push("/login");
    } else if (isAuthRoute && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const value = React.useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      checkAuth,
      logout,
    }),
    [isAuthenticated, isLoading, checkAuth, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
