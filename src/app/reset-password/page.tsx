"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8) { setError("Minimum 8 characters"); return; }

    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json();
      setError(data.error || "Reset failed");
    }
    setLoading(false);
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="font-mono text-sm text-alert-red">Invalid reset link.</p>
        <Link href="/login" className="font-mono text-sm text-ember mt-4 inline-block">Back to login</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold tracking-wide mb-4">PASSWORD RESET</h2>
        <p className="font-mono text-sm text-success mb-4">Your password has been updated.</p>
        <Link href="/login" className="px-6 py-3 bg-ember hover:bg-ember-glow text-white font-mono text-sm tracking-wider uppercase inline-block">Sign In</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <h2 className="font-display text-2xl font-bold tracking-wide text-center">NEW PASSWORD</h2>
      {error && <div className="p-3 bg-alert-red/10 border border-alert-red/20 text-alert-red font-mono text-sm">{error}</div>}
      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">New Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
          className="w-full px-4 py-3 bg-surface border border-border text-foreground placeholder:text-muted/50 focus:border-ember/50" placeholder="Min 8 characters" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Confirm Password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
          className="w-full px-4 py-3 bg-surface border border-border text-foreground placeholder:text-muted/50 focus:border-ember/50" placeholder="Confirm password" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-3.5 bg-ember hover:bg-ember-glow text-white font-mono text-sm tracking-wider uppercase disabled:opacity-50">
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-surface" />
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="text-muted">Loading...</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
