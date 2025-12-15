"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import type { PlanSelectionState } from "@/lib/onboarding-storage";
import { cn } from "@/lib/utils";

const planSchema = z.object({
  planCode: z.enum(["starter", "pro", "elite"]),
  billingCycle: z.enum(["monthly", "annual"]),
});

export type PlanSelectionValues = z.infer<typeof planSchema>;

type PlanSelectionStepProps = {
  defaultValues?: PlanSelectionState;
  isSubmitting: boolean;
  onSubmit: (values: PlanSelectionValues) => Promise<void> | void;
  onBack: () => void;
};

const plans = [
  {
    code: "starter",
    label: "Starter",
    price: "$0",
    summary: "Perfect for getting started with one team.",
    features: ["Up to 25 members", "5 staff seats", "Core scheduling tools"],
  },
  {
    code: "pro",
    label: "Pro",
    price: "$199",
    summary: "For growing clubs that need collaboration.",
    features: [
      "Up to 75 members",
      "15 staff seats",
      "Advanced communication suite",
    ],
  },
  {
    code: "elite",
    label: "Elite",
    price: "$399",
    summary: "Multi-team organizations with extended needs.",
    features: [
      "Up to 200 members",
      "40 staff seats",
      "Priority support & integrations",
    ],
  },
] as const;

const billingCycles = [
  { label: "Monthly", value: "monthly" },
  { label: "Annual", value: "annual" },
] as const;

export function PlanSelectionStep({
  defaultValues,
  isSubmitting,
  onSubmit,
  onBack,
}: PlanSelectionStepProps) {
  const form = useForm<PlanSelectionValues>({
    resolver: zodResolver(planSchema),
    defaultValues: defaultValues || {
      planCode: "starter",
      billingCycle: "monthly",
    },
  });

  // Use watch to reactively track form values
  const [currentPlan, currentBilling] = form.watch([
    "planCode",
    "billingCycle",
  ]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Step 2 of 3</p>
        <CardTitle className="text-3xl font-bold tracking-tight">
          Choose your plan
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          You can change plans at any time. Every plan starts with a free trial.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="billingCycle"
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-2">
                    {billingCycles.map((cycle) => (
                      <Button
                        key={cycle.value}
                        type="button"
                        variant={
                          currentBilling === cycle.value ? "default" : "outline"
                        }
                        className="flex-1"
                        onClick={() => field.onChange(cycle.value)}
                        disabled={isSubmitting}
                      >
                        {cycle.label}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="planCode"
              render={({ field }) => (
                <FormItem>
                  <div className="grid gap-4 md:grid-cols-3">
                    {plans.map((plan) => (
                      <button
                        key={plan.code}
                        type="button"
                        onClick={() => field.onChange(plan.code)}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition hover:border-primary",
                          currentPlan === plan.code
                            ? "border-primary bg-primary/5"
                            : "border-muted"
                        )}
                        disabled={isSubmitting}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-semibold">
                              {plan.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {plan.summary}
                            </p>
                          </div>
                          <span className="text-2xl font-bold">
                            {plan.price}
                          </span>
                        </div>
                        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                          {plan.features.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-center gap-2"
                            >
                              <span aria-hidden="true">•</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Continue to invites"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
