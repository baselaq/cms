"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ErrorBanner } from "@/components/ui/error-banner";
import { useForgotPassword } from "@/hooks/use-auth-mutations";
import { AxiosError } from "axios";
import { useState } from "react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const forgotPasswordMutation = useForgotPassword();
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(
      { email: data.email },
      {
        onSuccess: () => {
          setShowSuccess(true);
          form.reset();
        },
        onError: (error: unknown) => {
          const axiosError = error as AxiosError<{
            message?: string | string[];
            statusCode?: number;
          }>;

          let errorMessage = "Something went wrong. Please try again.";

          if (axiosError?.response?.data) {
            const data = axiosError.response.data;
            if (data.message) {
              if (Array.isArray(data.message)) {
                errorMessage = data.message[0] || errorMessage;
              } else {
                errorMessage = data.message;
              }
            }
          }

          form.setError("root", { message: errorMessage });
        },
      }
    );
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            <form className="p-6 md:p-8" onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Forgot your password?</h1>
                  <p className="text-muted-foreground text-balance">
                    Enter your email address and we&apos;ll send you a link to reset your password
                  </p>
                </div>
                {form.formState.errors.root && (
                  <Field>
                    <ErrorBanner
                      message={form.formState.errors.root.message || ""}
                    />
                  </Field>
                )}
                {showSuccess && (
                  <Field>
                    <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      <p className="font-medium">Check your email</p>
                      <p className="mt-1">
                        If an account with that email exists, we&apos;ve sent you a password reset link.
                      </p>
                    </div>
                  </Field>
                )}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="m@example.com"
                          disabled={forgotPasswordMutation.isPending || showSuccess}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Field>
                  <Button
                    type="submit"
                    disabled={forgotPasswordMutation.isPending || showSuccess}
                    className="w-full"
                  >
                    {forgotPasswordMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Sending...
                      </span>
                    ) : showSuccess ? (
                      "Email Sent"
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </Field>
                <FieldDescription className="text-center">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="underline-offset-2 hover:underline"
                  >
                    Sign in
                  </Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          </Form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/placeholder.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

