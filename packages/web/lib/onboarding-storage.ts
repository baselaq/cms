export type AdminInfoState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type ClubInfoState = {
  clubName: string;
  subdomain: string;
  timezone: string;
};

export type PlanSelectionState = {
  planCode: "starter" | "pro" | "elite";
  billingCycle: "monthly" | "annual";
};

export type InviteeState = {
  email: string;
  role: "admin" | "coach" | "staff" | "parent" | "player";
};

export type InviteMembersState = {
  invites: InviteeState[];
};

export type OnboardingState = {
  currentStep: number;
  adminInfo?: AdminInfoState;
  clubInfo?: ClubInfoState;
  plan?: PlanSelectionState;
  invites?: InviteMembersState;
  clubId?: string;
  onboardingToken?: string;
  onboardingExpiresAt?: string;
};

const STORAGE_KEY = "cms-onboarding-state";

const defaultState: OnboardingState = {
  currentStep: 1,
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readOnboardingState(): OnboardingState {
  if (!isBrowser()) {
    return { ...defaultState };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { ...defaultState };
  }
  try {
    const parsed = JSON.parse(raw) as OnboardingState;
    return {
      ...defaultState,
      ...parsed,
    };
  } catch {
    return { ...defaultState };
  }
}

export function writeOnboardingState(state: OnboardingState) {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function mergeOnboardingState(
  partial:
    | Partial<OnboardingState>
    | ((state: OnboardingState) => OnboardingState)
): OnboardingState {
  const previous = readOnboardingState();
  const next =
    typeof partial === "function"
      ? (partial as (state: OnboardingState) => OnboardingState)(previous)
      : {
          ...previous,
          ...partial,
        };
  writeOnboardingState(next);
  return next;
}

export function clearOnboardingState() {
  if (!isBrowser()) {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

