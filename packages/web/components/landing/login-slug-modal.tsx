"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { useClubBySlug } from "@/hooks/use-club-queries";
import { AxiosError } from "axios";
import { getClubUrl, getAppDomain } from "@/lib/app-config";

const loginSlugSchema = z.object({
  slug: z
    .string()
    .min(1, "Club slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens only"
    ),
});

type LoginSlugFormData = z.infer<typeof loginSlugSchema>;

interface LoginSlugModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginSlugModal({ open, onOpenChange }: LoginSlugModalProps) {
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginSlugFormData>({
    resolver: zodResolver(loginSlugSchema),
    defaultValues: {
      slug: "",
    },
  });

  const { isFetching, refetch } = useClubBySlug(
    slug,
    false // Don't auto-fetch, only when we call refetch
  );

  const checkClubMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const result = await refetch();
      if (!result.data) {
        throw new Error("Club not found");
      }
      return result.data;
    },
    onSuccess: (data) => {
      // Open club subdomain login page in new tab
      const clubUrl = getClubUrl(data.subdomain, "/login");
      window.open(clubUrl, "_blank");
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      if (err.response?.status === 404) {
        setError("Club not found with this slug. Please check and try again.");
      } else {
        const message = err.response?.data?.message;
        setError(
          Array.isArray(message)
            ? message[0]
            : message || "Unable to find club. Please try again."
        );
      }
    },
  });

  const onSubmit = async (data: LoginSlugFormData) => {
    setSlug(data.slug);
    checkClubMutation.mutate();
  };

  const isChecking = isFetching || checkClubMutation.isPending;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Login to Your Club"
      description="Enter your club slug to continue to the login page."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && <ErrorBanner message={error} />}

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Club Slug</FormLabel>
                <FormControl>
                  <div className="flex items-center rounded-md border px-3 focus-within:ring-2 focus-within:ring-ring">
                    <input
                      className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                      placeholder="your-club-slug"
                      disabled={isChecking}
                      {...field}
                    />
                    <span className="text-muted-foreground">
                      .{getAppDomain()}
                    </span>
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Enter your club&apos;s unique slug
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isChecking}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isChecking}>
              {isChecking ? "Checking..." : "Continue to Login"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
}
