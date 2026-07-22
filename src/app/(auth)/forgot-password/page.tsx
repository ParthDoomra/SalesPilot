"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-semibold">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for <span className="text-foreground">{email}</span>, we&apos;ve sent a link to reset your password.
        </p>
        <Link href="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-signal hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Reset your password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Enter your email and we&apos;ll send a reset link.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
        </div>
        <Button type="submit" className="mt-2" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>

      <Link href="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-signal hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </div>
  );
}
