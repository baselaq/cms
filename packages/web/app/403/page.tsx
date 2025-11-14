import { AccessDenied } from "@/components/access-denied";

export default function ForbiddenPage() {
  return (
    <AccessDenied
      title="403 - Access Forbidden"
      message="You don't have permission to access this page. Please contact your administrator if you believe this is an error."
      showHomeButton={true}
    />
  );
}

