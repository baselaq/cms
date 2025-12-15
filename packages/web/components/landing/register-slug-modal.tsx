"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useCheckSlugAvailability } from "@/hooks/use-club-queries";
import { Loader2 } from "lucide-react";
import { getAppDomain } from "@/lib/app-config";

const registerSlugSchema = z.object({
  slug: z
    .string()
    .min(1, "Club slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens only"
    ),
});

type RegisterSlugFormData = z.infer<typeof registerSlugSchema>;

interface RegisterSlugModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterSlugModal({
  open,
  onOpenChange,
}: RegisterSlugModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [debouncedSlug, setDebouncedSlug] = useState<string | null>(null);

  const form = useForm<RegisterSlugFormData>({
    resolver: zodResolver(registerSlugSchema),
    defaultValues: {
      slug: "",
    },
  });

  const slug = form.watch("slug");

  // Debounce slug for availability check - increased to reduce API calls
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setDebouncedSlug(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedSlug(slug);
    }, 1000); // 1000ms (1 second) debounce to throttle API calls

    return () => clearTimeout(timeoutId);
  }, [slug]);

  // Use React Query for availability check
  const { data: availabilityData, isFetching: isCheckingAvailability } =
    useCheckSlugAvailability(debouncedSlug, !!debouncedSlug);

  const availabilityStatus = availabilityData
    ? {
        available: availabilityData.available,
        message: availabilityData.available
          ? "This slug is available!"
          : "This slug is already taken.",
      }
    : { available: null, message: "" };

  const onSubmit = async (data: RegisterSlugFormData) => {
    if (!availabilityStatus.available) {
      setError("Please choose an available slug.");
      return;
    }

    setError(null);
    // Navigate to registration page with slug
    router.push(`/register?slug=${encodeURIComponent(data.slug)}`);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create Your Club"
      description="Choose a unique slug for your club. This will be your club's subdomain."
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
                      disabled={isCheckingAvailability}
                      {...field}
                    />
                    <span className="text-muted-foreground">
                      .{getAppDomain()}
                    </span>
                    {isCheckingAvailability && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </FormControl>
                {availabilityStatus.message && (
                  <p
                    className={`text-xs ${
                      availabilityStatus.available
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {availabilityStatus.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and hyphens only
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
              disabled={isCheckingAvailability}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCheckingAvailability || !availabilityStatus.available}
            >
              {isCheckingAvailability
                ? "Checking..."
                : "Continue to Registration"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
}
