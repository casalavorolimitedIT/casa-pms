import { register } from "@/app/(auth)/actions/auth-actions";
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

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const { error } = await searchParams;

  return (
    <Card className="w-full border-zinc-200/80 bg-white/85 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle data-display="true" className="text-3xl font-semibold tracking-tight text-zinc-900">Create account</CardTitle>
        <CardDescription>Register with email and password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={register} className="space-y-4">
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
            idleText="Register"
            pendingText="Creating account..."
          />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="text-primary underline" href="/login">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
