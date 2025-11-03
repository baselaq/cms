"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({
  message,
  onDismiss,
  className,
}: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive",
        className
      )}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <span>{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-destructive hover:text-destructive/80"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
