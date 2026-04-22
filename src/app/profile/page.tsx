"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

function ChangePasswordSection() {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (newPw !== confirm) { setPwError("Passwords don't match"); return; }
    if (newPw.length < 8) { setPwError("Minimum 8 characters"); return; }

    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
      });
      if (!res.ok) {
        const data = await res.json();
        setPwError(data.error || "Failed");
      } else {
        setPwSaved(true);
        setCurrent(""); setNewPw(""); setConfirm("");
        setTimeout(() => setPwSaved(false), 3000);
      }
    } catch { setPwError("Something went wrong"); }
    finally { setPwSaving(false); }
  }

  return (
    <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden mb-6 animate-fade-slide-up delay-250">
      <div className="px-5 py-4 border-b border-border-subtle">
        <h2 className="font-display text-sm font-bold tracking-wider text-muted uppercase">
          Change Password
        </h2>
      </div>
      <form onSubmit={handleChangePassword} className="p-5 space-y-4">
        {pwError && <div className="p-3 bg-alert-red/10 border border-alert-red/20 text-alert-red font-mono text-sm">{pwError}</div>}
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Current Password</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required
            className="w-full px-4 py-3 bg-background border border-border text-foreground placeholder:text-muted/50 focus:border-ember/50" placeholder="Enter current password" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">New Password</label>
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8}
            className="w-full px-4 py-3 bg-background border border-border text-foreground placeholder:text-muted/50 focus:border-ember/50" placeholder="Min 8 characters" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Confirm New Password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
            className="w-full px-4 py-3 bg-background border border-border text-foreground placeholder:text-muted/50 focus:border-ember/50" placeholder="Confirm new password" />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pwSaving}
            className="px-6 py-2.5 bg-ember hover:bg-ember-glow text-white text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(255,74,28,0.3)] disabled:opacity-50">
            {pwSaving ? "Changing..." : "Change Password"}
          </button>
          {pwSaved && <span className="font-mono text-[12px] text-success tracking-wider animate-fade-in uppercase">Password updated</span>}
        </div>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [telestaff, setTelestaff] = useState({ username: "", password: "" });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hasCredsSaved, setHasCredsSaved] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [defaults, setDefaults] = useState({ platoon: "1", homeStation: "1" });
  const [defaultsSaved, setDefaultsSaved] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setHasCredsSaved(data.hasTelestaffCreds);
          if (data.profile) {
            setDefaults({
              platoon: data.profile.platoon || "1",
              homeStation: String(data.profile.homeStation || 1),
            });
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, []);

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
        setHasCredsSaved(true);
        setTelestaff({ username: "", password: "" });
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

      {/* Default platoon & station */}
      <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden mb-6 animate-fade-slide-up delay-200">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="font-display text-sm font-bold tracking-wider text-muted uppercase">
            Home Defaults
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="font-mono text-[12px] tracking-wider text-muted uppercase">
            Dashboard loads your home platoon and station on first visit
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Platoon
              </label>
              <select
                value={defaults.platoon}
                onChange={(e) => setDefaults((prev) => ({ ...prev, platoon: e.target.value }))}
                className="w-full px-4 py-3 bg-background border border-border text-foreground transition-colors focus:border-ember/50 appearance-none cursor-pointer"
              >
                {["1", "2", "3", "4"].map((p) => (
                  <option key={p} value={p}>Platoon {p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Home Station
              </label>
              <select
                value={defaults.homeStation}
                onChange={(e) => setDefaults((prev) => ({ ...prev, homeStation: e.target.value }))}
                className="w-full px-4 py-3 bg-background border border-border text-foreground transition-colors focus:border-ember/50 appearance-none cursor-pointer"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>Station {s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                const res = await fetch("/api/profile", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(defaults),
                });
                if (res.ok) {
                  setDefaultsSaved(true);
                  setTimeout(() => setDefaultsSaved(false), 3000);
                }
              }}
              className="px-6 py-2.5 bg-ember hover:bg-ember-glow text-white text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(255,74,28,0.3)]"
            >
              Save Defaults
            </button>
            {defaultsSaved && (
              <span className="font-mono text-[12px] text-success tracking-wider animate-fade-in uppercase">
                Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Change Password */}
      <ChangePasswordSection />

      {/* Telestaff credentials */}
      <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden animate-fade-slide-up delay-300">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="font-display text-sm font-bold tracking-wider text-muted uppercase">
            Telestaff Connection
          </h2>
          {!loadingProfile && (
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${hasCredsSaved ? "bg-success" : "bg-amber"}`}
              />
              <span
                className={`text-xs font-medium ${hasCredsSaved ? "text-success" : "text-amber"}`}
              >
                {hasCredsSaved ? "Connected" : "Not connected"}
              </span>
            </div>
          )}
        </div>
        <form onSubmit={handleSaveTelestaff} className="p-5 space-y-4">
          {hasCredsSaved && (
            <div className="p-3 rounded-md bg-success/10 border border-success/20 text-success text-sm">
              Telestaff credentials are saved and encrypted. Enter new
              credentials below to update them.
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-alert-red/10 border border-alert-red/20 text-alert-red text-sm">
              {error}
            </div>
          )}

          <p className="text-xs text-muted leading-relaxed">
            {hasCredsSaved
              ? "Your credentials are securely stored. Update them below if needed."
              : "Enter your Telestaff credentials to enable live data scraping."}
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
              placeholder={
                hasCredsSaved
                  ? "Enter new username to update"
                  : "Your Telestaff username"
              }
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
              placeholder={
                hasCredsSaved
                  ? "Enter new password to update"
                  : "Your Telestaff password"
              }
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !telestaff.username || !telestaff.password}
              className="px-6 py-2.5 bg-ember hover:bg-ember-glow disabled:bg-ember-dim text-white text-sm font-semibold rounded-md transition-all hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50"
            >
              {saving ? "Saving..." : hasCredsSaved ? "Update Credentials" : "Save Credentials"}
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
            <p className="text-[13px] text-muted leading-relaxed">
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
