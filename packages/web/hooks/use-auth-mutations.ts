"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { post } from "@/lib/http-client";
import { httpClient } from "@/lib/http-client";
import { useAuth } from "@/contexts/auth-context";

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    onboardingComplete?: boolean;
  };
  expiresIn?: number;
}

export function useLogin() {
  const router = useRouter();
  const { checkAuth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await post<AuthResponse>("/auth/login", data);
      const authData = response.data;
      console.log("authData login", authData);

      // Save tokens to storage
      if (authData.accessToken && authData.refreshToken) {
        console.log("accessToken", authData.accessToken);
        console.log("refreshToken", authData.refreshToken);
        await httpClient.saveTokens(
          authData.accessToken,
          authData.refreshToken
        );
      }

      return authData;
    },
    onSuccess: async () => {
      // Invalidate queries first
      queryClient.invalidateQueries({ queryKey: ["auth"] });

      // Refresh the page to trigger SSR onboarding check
      // The login page will handle the redirect server-side based on onboarding status
      // Use a small delay to ensure cookies are set before server-side check
      setTimeout(() => {
        router.refresh();
      }, 50);
      
      // Try to fetch user in background to get full user data
      setTimeout(async () => {
        try {
          await checkAuth();
        } catch (error) {
          // Silently fail - user is already redirected
          console.warn("Background auth check failed:", error);
        }
      }, 100);
    },
  });
}

export function useRegister() {
  const router = useRouter();
  const { checkAuth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await post<AuthResponse>("/auth/register", data);
      const authData = response.data;

      // Save tokens to storage
      if (authData.accessToken && authData.refreshToken) {
        await httpClient.saveTokens(
          authData.accessToken,
          authData.refreshToken
        );
      }

      return authData;
    },
    onSuccess: async () => {
      // Invalidate queries first
      queryClient.invalidateQueries({ queryKey: ["auth"] });

      // Redirect immediately - don't wait for checkAuth which might fail
      // The next page will handle auth check naturally
      router.push("/dashboard/overview");

      // Try to fetch user in background, but don't block redirect
      // Use setTimeout to ensure redirect happens first
      setTimeout(async () => {
        try {
          await checkAuth();
        } catch (error) {
          // Silently fail - user is already redirected
          console.warn("Background auth check failed:", error);
        }
      }, 100);
    },
  });
}

interface ForgotPasswordData {
  email: string;
}

interface ResetPasswordData {
  token: string;
  password: string;
}

interface ForgotPasswordResponse {
  message: string;
}

interface ResetPasswordResponse {
  message: string;
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      const response = await post<ForgotPasswordResponse>(
        "/auth/forgot-password",
        data
      );
      return response.data;
    },
  });
}

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const response = await post<ResetPasswordResponse>(
        "/auth/reset-password",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      // After password reset, user needs to login
      // Login page will redirect to dashboard after successful login
      router.push("/login?reset=success");
    },
  });
}
