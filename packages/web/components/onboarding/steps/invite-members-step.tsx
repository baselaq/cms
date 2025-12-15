"use client";

import { z } from "zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { InviteMembersState } from "@/lib/onboarding-storage";
import { cn } from "@/lib/utils";

const inviteSchema = z.object({
  invites: z
    .array(
      z.object({
        email: z.string().email("Enter a valid email address"),
        role: z.enum(["admin", "coach", "staff", "parent", "player"]),
      })
    )
    .min(1, "Add at least one team member"),
});

export type InviteFormValues = z.infer<typeof inviteSchema>;

type InviteMembersStepProps = {
  defaultValues?: InviteMembersState;
  isSubmitting: boolean;
  onSubmit: (values: InviteFormValues) => Promise<void> | void;
  onBack: () => void;
};

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "coach", label: "Coach" },
  { value: "staff", label: "Staff" },
  { value: "parent", label: "Parent" },
  { value: "player", label: "Player" },
] as const;

export function InviteMembersStep({
  defaultValues,
  isSubmitting,
  onSubmit,
  onBack,
}: InviteMembersStepProps) {
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: defaultValues || {
      invites: [
        {
          email: "",
          role: "admin",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "invites",
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Final step
        </p>
        <CardTitle className="text-3xl font-bold tracking-tight">
          Invite your team
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Send early invites to coaches, staff, or parents. You can add more
          later from the dashboard.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-xl border border-dashed p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row">
                    <FormField
                      control={form.control}
                      name={`invites.${index}.email`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="member@yourclub.com"
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Controller
                      control={form.control}
                      name={`invites.${index}.role`}
                      render={({ field }) => (
                        <FormItem className="md:w-48">
                          <FormLabel>Role</FormLabel>
                          <FormControl>
                            <select
                              className={cn(
                                "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                              )}
                              disabled={isSubmitting}
                              {...field}
                            >
                              {roleOptions.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2 text-sm text-muted-foreground"
                      onClick={() => remove(index)}
                      disabled={isSubmitting}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  email: "",
                  role: "coach",
                })
              }
              disabled={isSubmitting || fields.length >= 5}
            >
              Add another invite
            </Button>

            <FormMessage>
              {form.formState.errors.invites?.message && (
                <span className="text-destructive">
                  {form.formState.errors.invites.message}
                </span>
              )}
            </FormMessage>

            <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground">
              <p>
                We’ll send beautifully branded email invitations once you
                complete onboarding.
              </p>
            </div>

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
                {isSubmitting ? "Sending invites..." : "Finish onboarding"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

