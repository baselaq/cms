"use client";

import { ComponentType, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";

/**
 * HOC to protect components with role-based access control
 * @param Component - The component to protect
 * @param allowedRoles - Array of role names that can access this component
 * @param options - Optional configuration
 * @returns Protected component that shows AccessDenied or redirects to /403 if user doesn't have required role
 */
export function withRoleGuard<P extends object>(
  Component: ComponentType<P>,
  allowedRoles: string[],
  options?: {
    redirectTo?: string;
    showAccessDenied?: boolean;
  }
) {
  const { redirectTo, showAccessDenied = false } = options || {};

  return function RoleGuardedComponent(props: P) {
    const { isAuthenticated, isLoading, hasAnyRole } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          // Redirect to login if not authenticated
          router.push("/login");
          return;
        }

        // Check if user has any of the allowed roles
        if (!hasAnyRole(allowedRoles)) {
          // Show AccessDenied inline or redirect to /403
          if (!showAccessDenied) {
            router.push(redirectTo || "/403");
          }
        }
      }
    }, [
      isLoading,
      isAuthenticated,
      hasAnyRole,
      allowedRoles,
      router,
      redirectTo,
      showAccessDenied,
    ]);

    // Show loading state
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      );
    }

    // Don't render if not authenticated (redirect will happen)
    if (!isAuthenticated) {
      return null;
    }

    // Check if user has required role
    if (!hasAnyRole(allowedRoles)) {
      // Show AccessDenied inline if configured, otherwise redirect (handled in useEffect)
      if (showAccessDenied) {
        return <AccessDenied />;
      }
      return null;
    }

    // Render the protected component
    return <Component {...props} />;
  };
}

