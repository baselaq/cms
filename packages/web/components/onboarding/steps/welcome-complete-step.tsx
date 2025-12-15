"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { getClubUrl } from "@/lib/app-config";

interface WelcomeCompleteStepProps {
  clubName: string;
  subdomain: string;
  onComplete: () => void;
}

export function WelcomeCompleteStep({
  clubName,
  subdomain,
  onComplete,
}: WelcomeCompleteStepProps) {
  return (
    <Card className="border-none shadow-none">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight">
          Welcome to {clubName}!
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your club workspace is ready. Let&apos;s get started!
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-muted/50 p-6">
          <h3 className="mb-4 font-semibold">What&apos;s been set up:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>
                Club workspace:{" "}
                <span className="font-medium text-foreground">
                  {subdomain ? getClubUrl(subdomain) : "Your club"}
                </span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Your admin account</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Club plan selected</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Team members invited</span>
            </li>
          </ul>
        </div>

        <Button onClick={onComplete} className="w-full" size="lg">
          Get Started
        </Button>
      </CardContent>
    </Card>
  );
}

