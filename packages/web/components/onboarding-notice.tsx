"use client";

import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

export function OnboardingNotice() {
  const { user, isLoading } = useAuth();
  const { state } = useSidebar();

  // Don't show if loading, no user, or onboarding is complete
  if (isLoading || !user || user.onboardingComplete) {
    return null;
  }

  const isCollapsed = state === "collapsed";

  if (isCollapsed) {
    return (
      <Link
        href="/onboarding"
        className="flex items-center justify-center rounded-md p-2 text-amber-600 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-950/50"
        title="Complete onboarding"
      >
        <AlertCircleIcon className="size-5" />
      </Link>
    );
  }

  return (
    <Link
      href="/onboarding"
      className={cn(
        "flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm transition-colors hover:bg-amber-100",
        "dark:border-amber-800 dark:bg-amber-950/50 dark:hover:bg-amber-950"
      )}
    >
      <AlertCircleIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-500" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-amber-800 dark:text-amber-200">
          Complete setup
        </p>
        <p className="truncate text-xs text-amber-600 dark:text-amber-400">
          Finish onboarding to unlock all features
        </p>
      </div>
    </Link>
  );
}

