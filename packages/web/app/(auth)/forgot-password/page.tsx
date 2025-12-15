import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default async function ForgotPasswordPage() {
  const cookieStore = await cookies();
  const headersList = await headers();
  const accessToken = cookieStore.get("accessToken")?.value;
  const hostname = headersList.get("host") || "";

  // Check if we're on main domain (no subdomain)
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "cms.test";
  const hostnameWithoutPort = hostname.split(":")[0];
  const isMainDomain =
    hostnameWithoutPort === appDomain ||
    hostnameWithoutPort === "localhost" ||
    hostnameWithoutPort === "127.0.0.1";

  // Redirect to landing page if accessed on main domain
  // Forgot password should only be accessible on club subdomains
  if (isMainDomain) {
    redirect("/");
  }

  // Redirect authenticated users to dashboard
  if (accessToken) {
    redirect("/dashboard/overview");
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
