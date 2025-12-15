"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/http-client";
import { AxiosError } from "axios";

interface CheckSlugResponse {
  available: boolean;
  exists: boolean;
}

interface ClubBySlugResponse {
  clubId: string;
  subdomain: string;
  name: string;
  status: string;
}

export function useCheckSlugAvailability(slug: string | null, enabled = true) {
  return useQuery<CheckSlugResponse, AxiosError>({
    queryKey: ["club", "check-slug", slug],
    queryFn: async () => {
      if (!slug || slug.length < 3) {
        throw new Error("Slug must be at least 3 characters");
      }
      const response = await get<CheckSlugResponse>(
        `/api/clubs/check-slug/${slug}`
      );
      return response.data;
    },
    enabled: enabled && !!slug && slug.length >= 3,
    staleTime: 30000, // Cache for 30 seconds to reduce duplicate calls
    gcTime: 60000, // Keep in cache for 1 minute
    retry: false, // Don't retry failed requests
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

export function useClubBySlug(slug: string | null, enabled = true) {
  return useQuery<ClubBySlugResponse, AxiosError>({
    queryKey: ["club", "by-slug", slug],
    queryFn: async () => {
      if (!slug) {
        throw new Error("Slug is required");
      }
      const response = await get<ClubBySlugResponse>(
        `/api/clubs/by-slug/${slug}`
      );
      return response.data;
    },
    enabled: enabled && !!slug,
    retry: false, // Don't retry on 404
  });
}

