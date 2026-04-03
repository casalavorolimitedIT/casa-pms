import { login } from "@/app/(auth)/actions/auth-actions";
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
import { LoginHashErrorBridge } from "./login-hash-error-bridge";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <>
      <LoginHashErrorBridge />
      <Card className="w-full border-zinc-200/80 bg-white/85 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle data-display="true" className="text-3xl font-semibold tracking-tight text-zinc-900">Sign in</CardTitle>
          <CardDescription>
            Use your email and password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <FormSubmitButton
              className="w-full"
              idleText="Sign in"
              pendingText="Signing in..."
            />

            <p className="text-center text-sm text-muted-foreground">
              <Link className="text-primary underline" href="/forgot-password">
                Forgot password?
              </Link>
            </p>

            <p className="text-center text-sm text-muted-foreground">
              No account?{" "}
              <Link className="text-primary underline" href="/register">
                Create one
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
