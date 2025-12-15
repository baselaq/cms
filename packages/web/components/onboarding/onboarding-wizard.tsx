"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { defineStepper } from "@/components/stepper";
import { PlanSelectionStep } from "@/components/onboarding/steps/plan-selection-step";
import type { PlanSelectionValues } from "@/components/onboarding/steps/plan-selection-step";
import { InviteMembersStep } from "@/components/onboarding/steps/invite-members-step";
import type { InviteFormValues } from "@/components/onboarding/steps/invite-members-step";
import {
  clearOnboardingState,
  mergeOnboardingState,
  OnboardingState,
  readOnboardingState,
} from "@/lib/onboarding-storage";
import {
  useUpdateClubPlan,
  useSendInvites,
  useCompleteOnboarding,
} from "@/hooks/use-onboarding-mutations";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Button } from "@/components/ui/button";
import { AxiosError } from "axios";
import { getErrorMessage } from "@/contexts/error-context";
import { getFrontendUrl } from "@/lib/app-config";
import { WelcomeCompleteStep } from "@/components/onboarding/steps/welcome-complete-step";

const { Stepper, useStepper } = defineStepper(
  {
    id: "plan-selection",
    title: "Plan Selection",
    description: "Choose a plan that fits your club",
  },
  {
    id: "invite-members",
    title: "Invite Members",
    description: "Bring key people into your workspace",
  },
  {
    id: "welcome-complete",
    title: "Welcome",
    description: "You're all set!",
  }
);

function OnboardingContent() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { current, next, prev, goTo } = useStepper();

  // React Query hooks must be called at the top level
  const updatePlanMutation = useUpdateClubPlan();
  const sendInvitesMutation = useSendInvites();
  const completeOnboardingMutation = useCompleteOnboarding();

  const isSubmitting =
    updatePlanMutation.isPending ||
    sendInvitesMutation.isPending ||
    completeOnboardingMutation.isPending;

  // Load onboarding state from sessionStorage (client-side only)
  // Auto-login is now handled server-side in the register page
  useEffect(() => {
    const existing = readOnboardingState();
    if (!existing.adminInfo) {
      router.replace("/register");
      return;
    }

    // Batch state updates using requestAnimationFrame to avoid synchronous setState in effect
    requestAnimationFrame(() => {
      setState(existing);
      setIsHydrated(true);

      // Restore step from state
      // Map old step numbers to new step IDs (club-info step removed)
      if (existing.currentStep) {
        const stepMap: Record<
          number,
          "plan-selection" | "invite-members" | "welcome-complete"
        > = {
          1: "plan-selection", // Old step 1 (club-info) -> now plan-selection
          2: "plan-selection",
          3: "invite-members",
          4: "welcome-complete",
        };
        const stepId = stepMap[existing.currentStep];
        if (stepId && current.id !== stepId) {
          goTo(stepId);
        }
      }
    });
  }, [router, current.id, goTo]);

  const persistState = (updater: Partial<OnboardingState>) => {
    const next = mergeOnboardingState((previous) => ({
      ...previous,
      ...updater,
    }));
    setState(next);
  };

  useEffect(() => {
    if (!state) return;
    // If we don't have clubId, redirect to register (club info is now in registration)
    if (!state.clubId) {
      router.replace("/register");
      return;
    }
  }, [state, router]);

  // Note: Onboarding status check is now handled server-side in the page component
  // This useEffect is removed to avoid client-side checks that can be done server-side

  if (!isHydrated || !state) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 p-6">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/40 border-t-primary" />
          <p className="text-sm text-muted-foreground">
            Preparing your onboarding experience...
          </p>
        </div>
      </div>
    );
  }

  const handlePlanSubmit = async (values: PlanSelectionValues) => {
    if (!state.clubId || !state.onboardingToken) {
      router.replace("/register");
      return;
    }
    setError(null);
    updatePlanMutation.mutate(
      {
        clubId: state.clubId,
        payload: values,
        onboardingToken: state.onboardingToken,
      },
      {
        onSuccess: () => {
          persistState({
            plan: values,
            currentStep: 2,
          });
          next();
        },
        onError: (submitError) => {
          let message = "Unable to update plan.";
          if (submitError instanceof AxiosError) {
            const errorData = submitError.response?.data as {
              message?: string | string[];
            };
            if (errorData?.message) {
              message = Array.isArray(errorData.message)
                ? errorData.message[0]
                : errorData.message;
            } else {
              message = getErrorMessage(submitError);
            }
          } else if (submitError instanceof Error) {
            message = submitError.message;
          }
          setError(message);
        },
      }
    );
  };

  const handleInviteSubmit = async (values: InviteFormValues) => {
    if (!state.clubId || !state.onboardingToken) {
      router.replace("/register");
      return;
    }
    setError(null);
    persistState({ invites: values });

    // First send invites, then complete onboarding
    sendInvitesMutation.mutate(
      {
        clubId: state.clubId,
        payload: values,
        onboardingToken: state.onboardingToken,
      },
      {
        onSuccess: () => {
          // After invites are sent, complete onboarding
          completeOnboardingMutation.mutate(
            {
              clubId: state.clubId!,
              onboardingToken: state.onboardingToken!,
            },
            {
              onSuccess: () => {
                // Move to welcome step after completion
                persistState({ currentStep: 3 });
                next();
              },
            }
          );
        },
        onError: (submitError) => {
          const message =
            submitError instanceof Error
              ? submitError.message
              : "Unable to send invites.";
          setError(message);
        },
      }
    );
  };

  const stepContent = (() => {
    switch (current.id) {
      case "plan-selection":
        return (
          <PlanSelectionStep
            defaultValues={state.plan}
            isSubmitting={isSubmitting}
            onSubmit={handlePlanSubmit}
            onBack={() => {
              // Can't go back from plan selection, redirect to main site
              window.location.href = getFrontendUrl();
            }}
          />
        );
      case "invite-members":
        return (
          <InviteMembersStep
            defaultValues={state.invites}
            isSubmitting={isSubmitting}
            onSubmit={async (values) => {
              persistState({ invites: values });
              await handleInviteSubmit(values);
            }}
            onBack={() => {
              persistState({ currentStep: 1 });
              prev();
            }}
          />
        );
      case "welcome-complete":
        return (
          <WelcomeCompleteStep
            clubName={state.clubInfo?.clubName || "Your Club"}
            subdomain={state.clubInfo?.subdomain || ""}
            onComplete={() => {
              // This is handled by useCompleteOnboarding hook
              // Just ensure state is cleared
              if (!completeOnboardingMutation.isPending) {
                clearOnboardingState();
                router.push("/dashboard/overview?welcome=1");
              }
            }}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <section className="bg-muted/30">
      <div className="mx-auto flex min-h-svh max-w-5xl flex-col gap-6 px-4 py-10">
        <Card className="space-y-4 rounded-3xl border bg-background/80 p-6 shadow-sm backdrop-blur">
          <Stepper.Navigation aria-label="Onboarding steps">
            <Stepper.Step of="plan-selection">
              <Stepper.Title>Plan Selection</Stepper.Title>
              <Stepper.Description>
                Choose a plan that fits your club
              </Stepper.Description>
            </Stepper.Step>
            <Stepper.Step of="invite-members">
              <Stepper.Title>Invite Members</Stepper.Title>
              <Stepper.Description>
                Bring key people into your workspace
              </Stepper.Description>
            </Stepper.Step>
            <Stepper.Step of="welcome-complete">
              <Stepper.Title>Welcome</Stepper.Title>
              <Stepper.Description>You&apos;re all set!</Stepper.Description>
            </Stepper.Step>
          </Stepper.Navigation>
        </Card>
        <Card className={cn("bg-background/90 p-2 shadow-lg backdrop-blur")}>
          <div className="space-y-4 p-4 md:p-6">
            {error && <ErrorBanner message={error} />}
            <Stepper.Panel>{stepContent}</Stepper.Panel>
            <Stepper.Controls>
              {current.id !== "plan-selection" &&
                current.id !== "welcome-complete" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const stepMap: Record<string, number> = {
                        "invite-members": 1,
                      };
                      persistState({ currentStep: stepMap[current.id] || 1 });
                      prev();
                    }}
                    disabled={isSubmitting}
                  >
                    Previous
                  </Button>
                )}
            </Stepper.Controls>
          </div>
        </Card>
      </div>
    </section>
  );
}

export function OnboardingWizard() {
  return (
    <Stepper.Provider
      variant="horizontal"
      labelOrientation="horizontal"
      initialStep="plan-selection"
    >
      <OnboardingContent />
    </Stepper.Provider>
  );
}
