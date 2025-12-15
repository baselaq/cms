"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export function WelcomeModal() {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const shouldShow = !dismissed && searchParams.get("welcome") === "1";

  if (typeof window === "undefined" || !shouldShow) {
    return null;
  }

  const dismiss = () => {
    setDismissed(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("welcome");
    const query = params.toString();
    router.replace(
      query ? `/dashboard/overview?${query}` : "/dashboard/overview",
      {
        scroll: false,
      }
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-lg rounded-3xl bg-background p-8 shadow-2xl">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            🎉
          </div>
          <h2 className="text-2xl font-semibold">Welcome to your new club</h2>
          <p className="text-sm text-muted-foreground">
            Your workspace is ready with default roles, demo data, and seeded
            permissions. Explore the dashboard to keep building momentum.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={dismiss}>Go to overview</Button>
          <Button variant="ghost" onClick={dismiss}>
            Maybe later
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

