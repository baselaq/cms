"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { AxiosError } from "axios";
import { httpClient } from "@/lib/http-client";
import { getMe } from "@/lib/auth-client";
import type { IAuthUser } from "@cms/shared";

interface AuthContextType {
  user: IAuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  roles: string[]; // Direct access to user roles
  permissions: string[]; // Direct access to user permissions
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  refreshUser: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = React.useState<IAuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchUser = React.useCallback(async () => {
    try {
      // httpClient automatically adds auth header from token storage
      const userData = await getMe();
      setUser({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        status: userData.status as "active" | "inactive" | "suspended",
        roles: userData.roles,
        permissions: userData.permissions,
      });
    } catch (error) {
      // Handle Axios errors
      if (error instanceof AxiosError) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          // Clear user on auth failure - don't retry to prevent loops
          setUser(null);
          // Clear tokens if auth fails
          await httpClient.clearTokens();
        } else {
          console.error("Failed to fetch user:", error.message);
          setUser(null);
        }
      } else if (error instanceof Error) {
        if (error.message === "Unauthorized" || error.message.includes("401")) {
          setUser(null);
          await httpClient.clearTokens();
        } else if (error.message.includes("Network error")) {
          console.warn("API connection error:", error.message);
          setUser(null);
        } else {
          console.error("Failed to fetch user:", error);
          setUser(null);
        }
      } else {
        console.error("Failed to fetch user:", error);
        setUser(null);
      }
    }
  }, []);

  const checkAuth = React.useCallback(async () => {
    try {
      // Check if access token exists in cookies
      const accessToken = Cookies.get("accessToken");

      if (accessToken) {
        // Token exists, fetch user (httpClient will use it automatically)
        await fetchUser();
        return true;
      }

      // No token found
      setUser(null);
      return false;
    } catch {
      setUser(null);
      return false;
    }
  }, [fetchUser]);

  const refreshUser = React.useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const logout = React.useCallback(async () => {
    try {
      // Clear tokens from storage
      await httpClient.clearTokens();
      // Clear auth state
      setUser(null);
      // Redirect to login
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear state and redirect even if clearTokens fails
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  const hasRole = React.useCallback(
    (role: string): boolean => {
      return user?.roles.includes(role) ?? false;
    },
    [user]
  );

  const hasPermission = React.useCallback(
    (permission: string): boolean => {
      return user?.permissions.includes(permission) ?? false;
    },
    [user]
  );

  const hasAnyRole = React.useCallback(
    (roles: string[]): boolean => {
      if (!user) return false;
      return roles.some((role) => user.roles.includes(role));
    },
    [user]
  );

  const hasAllRoles = React.useCallback(
    (roles: string[]): boolean => {
      if (!user) return false;
      return roles.every((role) => user.roles.includes(role));
    },
    [user]
  );

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

    if (isProtectedRoute && !user) {
      router.push("/login");
    } else if (isAuthRoute && user) {
      router.push("/");
    }
  }, [user, isLoading, pathname, router]);

  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      roles: user?.roles || [],
      permissions: user?.permissions || [],
      hasRole,
      hasPermission,
      hasAnyRole,
      hasAllRoles,
      refreshUser,
      checkAuth,
      logout,
    }),
    [
      user,
      isLoading,
      hasRole,
      hasPermission,
      hasAnyRole,
      hasAllRoles,
      refreshUser,
      checkAuth,
      logout,
    ]
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
