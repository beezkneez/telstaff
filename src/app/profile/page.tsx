"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [telestaff, setTelestaff] = useState({ username: "", password: "" });
  const [saved, setSaved] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSaveTelestaff(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telestaff_username: telestaff.username,
          telestaff_password: telestaff.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-8 animate-fade-slide-up">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
          YOUR <span className="text-ember">PROFILE</span>
        </h1>
        <p className="text-sm text-muted mt-1">
          Manage your account and Telestaff connection
        </p>
      </div>

      {/* Account info */}
      <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden mb-6 animate-fade-slide-up delay-150">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="font-display text-sm font-bold tracking-wider text-muted uppercase">
            Account
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {session?.user?.name || "—"}
              </p>
              <p className="text-xs text-muted">{session?.user?.email}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-xs text-success font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Telestaff credentials */}
      <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden animate-fade-slide-up delay-300">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="font-display text-sm font-bold tracking-wider text-muted uppercase">
            Telestaff Connection
          </h2>
        </div>
        <form onSubmit={handleSaveTelestaff} className="p-5 space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Enter your Telestaff credentials to enable live data scraping.
            Credentials are encrypted with AES-256 and never stored in
            plaintext.
          </p>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Telestaff Username
            </label>
            <input
              type="text"
              value={telestaff.username}
              onChange={(e) =>
                setTelestaff((prev) => ({ ...prev, username: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder:text-muted/50 transition-colors focus:border-ember/50"
              placeholder="Your Telestaff username"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Telestaff Password
            </label>
            <input
              type="password"
              value={telestaff.password}
              onChange={(e) =>
                setTelestaff((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder:text-muted/50 transition-colors focus:border-ember/50"
              placeholder="Your Telestaff password"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-ember hover:bg-ember-glow text-white text-sm font-semibold rounded-md transition-all hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]"
            >
              Save Credentials
            </button>
            {saved && (
              <span className="text-xs text-success font-medium animate-fade-in">
                Saved and encrypted
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 pt-2">
            <svg
              className="w-4 h-4 text-muted mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <p className="text-[11px] text-muted leading-relaxed">
              Your Telestaff credentials are encrypted with AES-256-GCM before
              storage. They are only decrypted server-side when scraping data on
              your behalf.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
