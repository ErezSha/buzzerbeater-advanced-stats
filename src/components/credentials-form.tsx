"use client";

import * as React from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CredentialsResult {
  ok: boolean;
  error?: { message?: string };
}

export function CredentialsForm({ onSaved }: { onSaved: () => void }) {
  const [login, setLogin] = React.useState("");
  const [securityCode, setSecurityCode] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSecurityCode, setShowSecurityCode] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!login.trim() || !securityCode.trim()) {
      setError("Both login and access code are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), securityCode }),
      });
      const payload = (await response.json()) as CredentialsResult;

      if (!payload.ok) {
        setError(
          payload.error?.message ??
            "Could not verify those credentials. Please check and try again.",
        );
        return;
      }

      setSecurityCode("");
      onSaved();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Connect your BuzzerBeater account
          </div>
          <CardTitle className="text-lg">Sign in to BBAPI</CardTitle>
          <CardDescription>
            Enter your BuzzerBeater login and read-only API access code. They
            are stored encrypted on the server and never exposed to the browser.
            Use the Sign out button to clear them at any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Login name</span>
              <input
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                autoComplete="username"
                placeholder="your-login-name"
                className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Access code</span>
              <div className="relative">
                <input
                  value={securityCode}
                  onChange={(event) => setSecurityCode(event.target.value)}
                  type={showSecurityCode ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="read-only security code"
                  className="h-11 w-full rounded-md border bg-background px-3 pr-10 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowSecurityCode((shown) => !shown)}
                  aria-label={
                    showSecurityCode ? "Hide access code" : "Show access code"
                  }
                  aria-pressed={showSecurityCode}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition hover:text-foreground"
                >
                  {showSecurityCode ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" disabled={isSubmitting} className="mt-1">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? "Verifying…" : "Connect"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
