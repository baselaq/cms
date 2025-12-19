import { redirect } from "next/navigation";

export default async function SignupPage() {
  // Redirect /signup to /register
  redirect("/register");
}
