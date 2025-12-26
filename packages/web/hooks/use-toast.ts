"use client";

import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    ({ title, description, variant = "default" }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, title, description, variant };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);

      // Log to console in development
      if (process.env.NODE_ENV === "development") {
        console.log("Toast:", { title, description, variant });
      }
    },
    []
  );

  return { toast, toasts };
}
