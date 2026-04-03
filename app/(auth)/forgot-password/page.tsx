import { requestPasswordReset } from "@/app/(auth)/actions/auth-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { error, success } = await searchParams;

  return (
    <Card className="w-full border-zinc-200/80 bg-white/85 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle data-display="true" className="text-3xl font-semibold tracking-tight text-zinc-900">Forgot password</CardTitle>
        <CardDescription>
          Enter your email and we will send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={requestPasswordReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="text-sm text-foreground" role="status">
              {success}
            </p>
          ) : null}

          <FormSubmitButton
            className="w-full"
            idleText="Send reset link"
            pendingText="Sending link..."
          />

          <p className="text-center text-sm text-muted-foreground">
            Back to{" "}
            <Link className="text-primary underline" href="/login">
              sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
