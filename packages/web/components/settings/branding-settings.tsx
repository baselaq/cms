"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, patch, post } from "@/lib/http-client";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { useState, useRef } from "react";

const brandingSchema = z.object({
  themeMode: z.enum(["light", "dark", "system"]),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
});

type BrandingFormData = z.infer<typeof brandingSchema>;

interface SettingsData {
  themeMode: "light" | "dark" | "system";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  brandingLogoUrl: string | null;
  brandingCoverUrl: string | null;
}

const useToast = () => {
  const toast = (options: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => {
    if (options.variant === "destructive") {
      alert(`Error: ${options.title}\n${options.description || ""}`);
    } else {
      alert(`Success: ${options.title}\n${options.description || ""}`);
    }
  };
  return { toast };
};

export function BrandingSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await get<SettingsData>("/settings");
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: BrandingFormData) => {
      return await patch("/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({
        title: "Settings updated",
        description: "Your branding settings have been saved successfully.",
      });
    },
    onError: (error: unknown) => {
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message
          : "Failed to update settings";
      toast({
        title: "Error",
        description: errorMessage || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (file: File, type: "logo" | "cover") => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    if (type === "logo") {
      setUploadingLogo(true);
    } else {
      setUploadingCover(true);
    }

    try {
      // Axios will automatically set Content-Type for FormData
      await post<{ url: string }>(`/settings/upload/${type}`, formData);

      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({
        title: "Image uploaded",
        description: `${
          type === "logo" ? "Logo" : "Cover"
        } image uploaded successfully.`,
      });
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message
          : "Failed to upload image";
      toast({
        title: "Upload failed",
        description: errorMessage || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      if (type === "logo") {
        setUploadingLogo(false);
      } else {
        setUploadingCover(false);
      }
    }
  };

  const form = useForm<BrandingFormData>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      themeMode: "system",
      primaryColor: "#111827",
      secondaryColor: "#0ea5e9",
      accentColor: "#f97316",
    },
    values: settings
      ? {
          themeMode: settings.themeMode,
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor,
          accentColor: settings.accentColor,
        }
      : undefined,
  });

  const onSubmit = (data: BrandingFormData) => {
    updateMutation.mutate(data);
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme & Colors</CardTitle>
          <CardDescription>
            Customize your organization&apos;s theme and color scheme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="themeMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme Mode</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                        {...field}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            {...field}
                            className="h-10 w-20"
                          />
                          <Input placeholder="#111827" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            {...field}
                            className="h-10 w-20"
                          />
                          <Input placeholder="#0ea5e9" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accent Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            {...field}
                            className="h-10 w-20"
                          />
                          <Input placeholder="#f97316" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Colors
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Upload your organization logo. Recommended size: 200x200px.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.brandingLogoUrl && (
            <div className="relative inline-block">
              <img
                src={settings.brandingLogoUrl}
                alt="Logo"
                className="h-32 w-32 rounded-lg object-cover border"
              />
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, "logo");
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cover Image</CardTitle>
          <CardDescription>
            Upload a cover image for your organization. Recommended size:
            1200x400px.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.brandingCoverUrl && (
            <div className="relative w-full">
              <img
                src={settings.brandingCoverUrl}
                alt="Cover"
                className="h-48 w-full rounded-lg object-cover border"
              />
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, "cover");
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
            >
              {uploadingCover ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Cover
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
