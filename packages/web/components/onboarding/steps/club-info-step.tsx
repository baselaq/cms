 "use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  AdminInfoState,
  ClubInfoState,
} from "@/lib/onboarding-storage";
import { getAppDomain } from "@/lib/app-config";

const clubInfoSchema = z.object({
  clubName: z
    .string()
    .min(3, "Club name must be at least 3 characters long")
    .max(100, "Club name is too long"),
  subdomain: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens only"
    ),
  timezone: z.string().min(1, "Timezone is required"),
});

export type ClubInfoFormValues = z.infer<typeof clubInfoSchema>;

type ClubInfoStepProps = {
  defaultValues?: ClubInfoState;
  adminInfo: AdminInfoState;
  isSubmitting: boolean;
  onSubmit: (values: ClubInfoFormValues) => Promise<void> | void;
  onBackToRegister: () => void;
};

const timezones = [
  { label: "Eastern (ET)", value: "America/New_York" },
  { label: "Central (CT)", value: "America/Chicago" },
  { label: "Mountain (MT)", value: "America/Denver" },
  { label: "Pacific (PT)", value: "America/Los_Angeles" },
  { label: "UTC", value: "UTC" },
];

export function ClubInfoStep({
  defaultValues,
  adminInfo,
  isSubmitting,
  onSubmit,
  onBackToRegister,
}: ClubInfoStepProps) {
  const form = useForm<ClubInfoFormValues>({
    resolver: zodResolver(clubInfoSchema),
    defaultValues: defaultValues || {
      clubName: "",
      subdomain: "",
      timezone: "America/New_York",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Welcome, {adminInfo.firstName}! Let’s set up your club profile.
        </p>
        <CardTitle className="text-3xl font-bold tracking-tight">
          Tell us about your club
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          We’ll use this information to set up your dedicated workspace and
          tenant database.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField
              control={form.control}
              name="clubName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Club name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Northside United FC"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subdomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Club subdomain</FormLabel>
                  <FormControl>
                    <div className="flex items-center rounded-md border px-3 focus-within:ring-2 focus-within:ring-ring">
                      <span className="text-muted-foreground">{getAppDomain()}/</span>
                      <input
                        className={cn(
                          "w-full bg-transparent py-2 text-sm outline-none",
                          "placeholder:text-muted-foreground"
                        )}
                        placeholder="northside-united"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Lowercase letters, numbers, and hyphens only.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary timezone</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isSubmitting}
                      {...field}
                    >
                      {timezones.map((zone) => (
                        <option key={zone.value} value={zone.value}>
                          {zone.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onBackToRegister}
                disabled={isSubmitting}
              >
                Back to register
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Provisioning..." : "Continue to plan selection"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

