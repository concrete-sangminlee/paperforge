"use client";

import { useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");

  return (
    <div className="flex flex-col gap-6">
      {registered && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          Account created successfully. Please sign in.
        </div>
      )}
      <LoginForm />
      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>
      <OAuthButtons />
    </div>
  );
}
