"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, patch } from "@/lib/http-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// Simple toast implementation - replace with proper toast library if needed
const useToast = () => {
  const toast = (options: { title: string; description?: string; variant?: "default" | "destructive" }) => {
    // For now, just show an alert. In production, use a proper toast library
    if (options.variant === "destructive") {
      alert(`Error: ${options.title}\n${options.description || ""}`);
    } else {
      alert(`Success: ${options.title}\n${options.description || ""}`);
    }
  };
  return { toast };
};
import { Loader2 } from "lucide-react";

const profileSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required").max(255),
  organizationDescription: z.string().max(1000).optional(),
  supportEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  timezone: z.string().min(1, "Timezone is required"),
  locale: z.string().min(1, "Locale is required"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface SettingsData {
  organizationName: string | null;
  organizationDescription: string | null;
  supportEmail: string | null;
  timezone: string;
  locale: string;
}

export function ProfileSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await get<SettingsData>("/settings");
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await patch("/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({
        title: "Settings updated",
        description: "Your profile settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      organizationName: "",
      organizationDescription: "",
      supportEmail: "",
      timezone: "America/New_York",
      locale: "en-US",
    },
    values: settings
      ? {
          organizationName: settings.organizationName || "",
          organizationDescription: settings.organizationDescription || "",
          supportEmail: settings.supportEmail || "",
          timezone: settings.timezone,
          locale: settings.locale,
        }
      : undefined,
  });

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate({
      ...data,
      supportEmail: data.supportEmail || null,
      organizationDescription: data.organizationDescription || null,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Profile</CardTitle>
        <CardDescription>
          Update your organization details and contact information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Club Name" {...field} />
                  </FormControl>
                  <FormDescription>
                    The official name of your organization.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organizationDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your organization..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A brief description of your organization.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supportEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Support Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="support@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Email address for support inquiries.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <Input placeholder="America/New_York" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="locale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Locale</FormLabel>
                    <FormControl>
                      <Input placeholder="en-US" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

