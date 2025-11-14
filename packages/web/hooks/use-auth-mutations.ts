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
      await checkAuth();
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      router.push("/");
      router.refresh();
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
      await checkAuth();
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      router.push("/");
      router.refresh();
    },
  });
}
