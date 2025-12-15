"use client";

import * as React from "react";
import { AxiosError } from "axios";
import { ErrorBanner } from "@/components/ui/error-banner";

interface ErrorContextValue {
  showError: (message: string) => void;
  clearError: () => void;
  currentError: string | null;
}

const ErrorContext = React.createContext<ErrorContextValue | undefined>(
  undefined
);

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [currentError, setCurrentError] = React.useState<string | null>(null);

  const showError = React.useCallback((message: string) => {
    setCurrentError(message);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setCurrentError(null);
    }, 5000);
  }, []);

  const clearError = React.useCallback(() => {
    setCurrentError(null);
  }, []);

  const value = React.useMemo(
    () => ({
      showError,
      clearError,
      currentError,
    }),
    [showError, clearError, currentError]
  );

  return (
    <ErrorContext.Provider value={value}>
      {children}
      {currentError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <ErrorBanner message={currentError} onDismiss={clearError} />
        </div>
      )}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = React.useContext(ErrorContext);
  if (context === undefined) {
    throw new Error("useError must be used within an ErrorProvider");
  }
  return context;
}

// Helper function to extract error message from AxiosError
export function getErrorMessage(error: AxiosError): string {
  if (error.response?.data) {
    const data = error.response.data as { message?: string | string[] };
    if (data.message) {
      // Handle both string and array messages (NestJS can return either)
      if (Array.isArray(data.message)) {
        return data.message[0] || "An error occurred. Please try again.";
      }
      return data.message;
    }
  }

  if (error.response?.status === 401) {
    return "Authentication required. Please log in again.";
  }

  if (error.response?.status === 403) {
    return "You don't have permission to perform this action.";
  }

  return error.message || "An error occurred. Please try again.";
}
