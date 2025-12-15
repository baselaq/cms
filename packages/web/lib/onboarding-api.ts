import { patch, post } from "@/lib/http-client";

export type RegisterClubPayload = {
  clubName: string;
  subdomain: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPassword: string;
  timezone?: string;
  planCode?: "starter" | "pro" | "elite";
};

export type RegisterClubResponse = {
  clubId: string;
  onboardingToken: string;
  subdomain: string;
  onboardingExpiresAt: string;
};

export type UpdatePlanPayload = {
  planCode: "starter" | "pro" | "elite";
  billingCycle: "monthly" | "annual";
};

export type InviteMembersPayload = {
  invites: Array<{
    email: string;
    role: "admin" | "coach" | "staff" | "parent" | "player";
    invitedBy?: string;
  }>;
};

export async function registerClub(payload: RegisterClubPayload) {
  const response = await post<RegisterClubResponse>(
    "/api/clubs/register",
    payload
  );
  return response.data;
}

export async function updateClubPlan(
  clubId: string,
  payload: UpdatePlanPayload,
  onboardingToken: string
) {
  const response = await patch(
    `/api/clubs/${clubId}/plan`,
    payload,
    {
      headers: {
        "x-onboarding-token": onboardingToken,
      },
    }
  );
  return response.data as {
    planCode: string;
    billingCycle: string;
    status: string;
  };
}

export async function sendInvites(
  clubId: string,
  payload: InviteMembersPayload,
  onboardingToken: string
) {
  const response = await post(
    `/api/clubs/${clubId}/invite`,
    payload,
    {
      headers: {
        "x-onboarding-token": onboardingToken,
      },
    }
  );
  return response.data as {
    count: number;
  };
}

export async function completeOnboarding(
  clubId: string,
  onboardingToken: string
) {
  const response = await patch(
    `/api/clubs/${clubId}/complete`,
    {},
    {
      headers: {
        "x-onboarding-token": onboardingToken,
      },
    }
  );
  return response.data as {
    completedAt: string;
  };
}

