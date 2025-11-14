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
      const message = getErrorMessage(error);
      showError(message);

      // If it's a 401, also redirect to login after a short delay
      if (error.response?.status === 401) {
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
