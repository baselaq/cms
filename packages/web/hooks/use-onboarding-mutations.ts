"use client";

import { useMutation } from "@tanstack/react-query";
import {
  registerClub,
  updateClubPlan,
  sendInvites,
  completeOnboarding,
  type RegisterClubPayload,
  type UpdatePlanPayload,
  type InviteMembersPayload,
} from "@/lib/onboarding-api";
import {
  mergeOnboardingState,
  clearOnboardingState,
} from "@/lib/onboarding-storage";
import { getClubUrl } from "@/lib/app-config";

export function useRegisterClub() {
  return useMutation({
    mutationFn: async (payload: RegisterClubPayload) => {
      clearOnboardingState();
      return await registerClub(payload);
    },
    onSuccess: (response, variables) => {
      // Store admin info for onboarding
      mergeOnboardingState({
        currentStep: 1,
        adminInfo: {
          firstName: variables.adminFirstName,
          lastName: variables.adminLastName,
          email: variables.adminEmail,
          password: variables.adminPassword,
        },
        clubInfo: {
          clubName: variables.clubName,
          subdomain: variables.subdomain,
          timezone: variables.timezone || "America/New_York",
        },
        clubId: response.clubId,
        onboardingToken: response.onboardingToken,
        onboardingExpiresAt: response.onboardingExpiresAt,
      });

      // Open club subdomain in new tab with onboarding token
      // Server-side handler will auto-login admin and redirect to onboarding if needed
      const clubUrl = getClubUrl(
        variables.subdomain,
        `/register?token=${encodeURIComponent(response.onboardingToken)}`
      );
      window.open(clubUrl, "_blank");
    },
  });
}

export function useUpdateClubPlan() {
  return useMutation({
    mutationFn: async ({
      clubId,
      payload,
      onboardingToken,
    }: {
      clubId: string;
      payload: UpdatePlanPayload;
      onboardingToken: string;
    }) => {
      return await updateClubPlan(clubId, payload, onboardingToken);
    },
  });
}

export function useSendInvites() {
  return useMutation({
    mutationFn: async ({
      clubId,
      payload,
      onboardingToken,
    }: {
      clubId: string;
      payload: InviteMembersPayload;
      onboardingToken: string;
    }) => {
      return await sendInvites(clubId, payload, onboardingToken);
    },
  });
}

export function useCompleteOnboarding() {
  return useMutation({
    mutationFn: async ({
      clubId,
      onboardingToken,
    }: {
      clubId: string;
      onboardingToken: string;
    }) => {
      return await completeOnboarding(clubId, onboardingToken);
    },
    // Note: onSuccess is handled by the component to show the welcome step first
    // The component will clear state and redirect when the user clicks "Get Started"
  });
}
