import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign in — Rook & Roll" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
