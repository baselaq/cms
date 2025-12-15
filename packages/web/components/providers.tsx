"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ErrorProvider,
  useError,
  getErrorMessage,
} from "@/contexts/error-context";
import { setGlobalErrorHandler } from "@/lib/http-client";
import { AxiosError } from "axios";

function ErrorHandlerInitializer({ children }: { children: React.ReactNode }) {
  const { showError } = useError();

  React.useEffect(() => {
    // Set up global error handler for 401/403 errors
    setGlobalErrorHandler((error: AxiosError) => {
      // Skip showing global error for auth endpoints (login/register)
      // These errors are handled in the form components
      const requestUrl = error.config?.url || "";
      const isAuthEndpoint =
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/register");

      if (isAuthEndpoint) {
        return; // Don't show global error or redirect for auth endpoints
      }

      // Check if we're already on the login page
      const isOnLoginPage =
        typeof window !== "undefined" &&
        (window.location.pathname === "/login" ||
          window.location.pathname.startsWith("/login"));

      const message = getErrorMessage(error);
      showError(message);

      // If it's a 401, redirect to login after a short delay
      // But don't redirect if we're already on the login page or if it's an auth endpoint
      if (error.response?.status === 401 && !isOnLoginPage && !isAuthEndpoint) {
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }, 2000);
      }
    });
  }, [showError]);

  return <>{children}</>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorProvider>
        <ErrorHandlerInitializer>{children}</ErrorHandlerInitializer>
      </ErrorProvider>
    </QueryClientProvider>
  );
}
