"use client";

import { useState, useEffect } from "react";

interface UserInfo {
  id: string;
  email: string;
  isAdmin: boolean;
  useSystemCreds: boolean;
  hasTelestaffCreds: boolean;
  createdAt: string;
  profile: { name: string; platoon: string; homeStation: number } | null;
}

interface Settings {
  cronTime1: string;
  cronTime2: string;
  cronEnabled: boolean;
  daysBack: number;
  daysAhead: number;
  minStaffing: number;
}

interface CacheStats {
  staffingEntries: number;
  otwpEntries: number;
  lastStaffingScrape: string | null;
  lastOtwpScrape: string | null;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin?action=users").then((r) => r.json()),
      fetch("/api/admin?action=settings").then((r) => r.json()),
      fetch("/api/admin?action=cache-stats").then((r) => r.json()),
    ])
      .then(([u, s, c]) => {
        if (u.error) throw new Error(u.error);
        setUsers(u);
        setSettings(s);
        setCacheStats(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  async function updateUser(userId: string, data: Partial<UserInfo>) {
    await fetch("/api/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-user", userId, ...data }),
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...data } : u))
    );
    showMessage("User updated");
  }

  async function deleteUser(userId: string) {
    if (!confirm("Delete this user?")) return;
    await fetch("/api/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-user", userId }),
    });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    showMessage("User deleted");
  }

  async function saveSettings() {
    if (!settings) return;
    await fetch("/api/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-settings", ...settings }),
    });
    showMessage("Settings saved");
  }

  async function clearCache() {
    if (!confirm("Clear all cached data? Next load will re-scrape.")) return;
    await fetch("/api/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear-cache" }),
    });
    setCacheStats({ staffingEntries: 0, otwpEntries: 0, lastStaffingScrape: null, lastOtwpScrape: null });
    showMessage("Cache cleared");
  }

  async function triggerScrape() {
    await fetch("/api/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trigger-scrape" }),
    });
    showMessage("Scrape triggered — check logs");
  }

  async function backfillYTD() {
    if (!confirm("Backfill OTWP data from Jan 1 to today? This runs in the background and may take 1-2 hours.")) return;
    const res = await fetch("/api/admin/backfill", { method: "POST" });
    const data = await res.json();
    showMessage(`${data.message}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-6 w-6 text-ember" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="p-4 bg-alert-red/10 border border-alert-red/20 text-alert-red font-mono text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6 animate-fade-slide-up">
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-[0.1em]">
          ADMIN<span className="text-ember">//</span>PANEL
        </h1>
        <p className="font-mono text-[11px] tracking-[0.15em] text-muted mt-1 uppercase">
          Manage users, scraping, and cache
        </p>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 text-success font-mono text-xs tracking-wider animate-fade-in">
          {message}
        </div>
      )}

      <div className="space-y-4">
        {/* Scrape Settings */}
        {settings && (
          <div className="bg-surface border border-border animate-fade-slide-up">
            <div className="px-4 py-3 border-b border-border bg-surface-raised/50 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">
                Scrape Schedule
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={triggerScrape}
                  className="px-3 py-1.5 bg-ember hover:bg-ember-glow text-white font-mono text-[10px] tracking-wider uppercase transition-all"
                >
                  Run Now
                </button>
                <button
                  onClick={saveSettings}
                  className="px-3 py-1.5 bg-surface-overlay border border-border text-foreground font-mono text-[10px] tracking-wider uppercase hover:border-ember/40 transition-all"
                >
                  Save
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <label className="block font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-2">
                  Scrape 1 (UTC)
                </label>
                <input
                  value={settings.cronTime1}
                  onChange={(e) => setSettings({ ...settings, cronTime1: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border font-mono text-xs text-foreground"
                  placeholder="0 13 * * *"
                />
                <p className="font-mono text-[8px] text-muted mt-1">7 AM MT</p>
              </div>
              <div>
                <label className="block font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-2">
                  Scrape 2 (UTC)
                </label>
                <input
                  value={settings.cronTime2}
                  onChange={(e) => setSettings({ ...settings, cronTime2: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border font-mono text-xs text-foreground"
                  placeholder="0 23 * * *"
                />
                <p className="font-mono text-[8px] text-muted mt-1">5 PM MT</p>
              </div>
              <div>
                <label className="block font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-2">
                  Enabled
                </label>
                <button
                  onClick={() => setSettings({ ...settings, cronEnabled: !settings.cronEnabled })}
                  className={`px-4 py-2 font-mono text-xs tracking-wider ${
                    settings.cronEnabled
                      ? "bg-success/20 text-success border border-success/30"
                      : "bg-alert-red/20 text-alert-red border border-alert-red/30"
                  }`}
                >
                  {settings.cronEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <div>
                <label className="block font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-2">
                  Days Back
                </label>
                <input
                  type="number"
                  value={settings.daysBack}
                  onChange={(e) => setSettings({ ...settings, daysBack: parseInt(e.target.value) || 6 })}
                  className="w-full px-3 py-2 bg-background border border-border font-mono text-xs text-foreground"
                />
              </div>
              <div>
                <label className="block font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-2">
                  Days Ahead
                </label>
                <input
                  type="number"
                  value={settings.daysAhead}
                  onChange={(e) => setSettings({ ...settings, daysAhead: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 bg-background border border-border font-mono text-xs text-foreground"
                />
              </div>
              <div>
                <label className="block font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-2">
                  Min Staffing
                </label>
                <input
                  type="number"
                  value={settings.minStaffing}
                  onChange={(e) => setSettings({ ...settings, minStaffing: parseInt(e.target.value) || 216 })}
                  className="w-full px-3 py-2 bg-background border border-border font-mono text-xs text-foreground"
                />
              </div>
            </div>
          </div>
        )}

        {/* Cache */}
        {cacheStats && (
          <div className="bg-surface border border-border animate-fade-slide-up delay-150">
            <div className="px-4 py-3 border-b border-border bg-surface-raised/50 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">
                Cache
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={backfillYTD}
                  className="px-3 py-1.5 bg-ember/20 border border-ember/30 text-ember font-mono text-[10px] tracking-wider uppercase hover:bg-ember/30 transition-all"
                >
                  Backfill YTD
                </button>
                <button
                  onClick={clearCache}
                  className="px-3 py-1.5 bg-alert-red/20 border border-alert-red/30 text-alert-red font-mono text-[10px] tracking-wider uppercase hover:bg-alert-red/30 transition-all"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="font-display text-2xl font-bold text-ember">{cacheStats.staffingEntries}</p>
                <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mt-1">Roster Entries</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold">{cacheStats.otwpEntries}</p>
                <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mt-1">OTWP Entries</p>
              </div>
              <div>
                <p className="font-mono text-xs text-foreground">
                  {cacheStats.lastStaffingScrape
                    ? new Date(cacheStats.lastStaffingScrape).toLocaleString()
                    : "Never"}
                </p>
                <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mt-1">Last Roster Scrape</p>
              </div>
              <div>
                <p className="font-mono text-xs text-foreground">
                  {cacheStats.lastOtwpScrape
                    ? new Date(cacheStats.lastOtwpScrape).toLocaleString()
                    : "Never"}
                </p>
                <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mt-1">Last OTWP Scrape</p>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        <div className="bg-surface border border-border animate-fade-slide-up delay-300">
          <div className="px-4 py-3 border-b border-border bg-surface-raised/50 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">
              Users ({users.length})
            </h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {users.map((user) => (
              <div key={user.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-foreground">
                      {user.profile?.name || user.email}
                    </span>
                    {user.isAdmin && (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 bg-ember/20 text-ember border border-ember/30 tracking-wider">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-muted flex flex-wrap gap-3 mt-1">
                    <span>{user.email}</span>
                    {user.profile && (
                      <>
                        <span>PLT-{user.profile.platoon}</span>
                        <span>STN-{String(user.profile.homeStation).padStart(2, "0")}</span>
                      </>
                    )}
                    <span>
                      Creds: {user.hasTelestaffCreds ? "Own" : user.useSystemCreds ? "System" : "None"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateUser(user.id, { useSystemCreds: !user.useSystemCreds })}
                    className={`px-2 py-1 font-mono text-[9px] tracking-wider border transition-all ${
                      user.useSystemCreds
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-surface-overlay text-muted border-border"
                    }`}
                  >
                    {user.useSystemCreds ? "SYS CREDS" : "OWN CREDS"}
                  </button>
                  {!user.isAdmin && (
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="px-2 py-1 font-mono text-[9px] tracking-wider text-alert-red border border-alert-red/30 hover:bg-alert-red/10 transition-all"
                    >
                      DELETE
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Codes Reference */}
        <div className="bg-surface border border-border animate-fade-slide-up delay-400">
          <div className="px-4 py-3 border-b border-border bg-surface-raised/50">
            <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">
              Status Codes
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {[
                { code: "REG", color: "text-muted", bg: "", label: "Regular — On Roster" },
                { code: "TW", color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", label: "Trade Working — On Roster" },
                { code: "TWU", color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", label: "Trade Working Union — On Roster" },
                { code: "ATI", color: "text-purple-400", bg: "bg-purple-900/20", label: "Acting Training Instructor — On Roster" },
                { code: "Ins", color: "text-orange-400", bg: "bg-orange-900/20", label: "Instructor (any) — On Roster" },
                { code: ".Vac", color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Vacation — Off Roster" },
                { code: ".TNW", color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", label: "Trade Not Working — Off Roster" },
                { code: ".TNW Union", color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", label: "TNW Union — Off Roster" },
                { code: "LieuO", color: "text-green-400", bg: "bg-green-500/10", label: "Lieu Day Off — Off Roster" },
                { code: ".SA", color: "text-emerald-400", bg: "bg-emerald-900/20", label: "Special Assignment (any) — Off Roster" },
                { code: ".SUR", color: "text-purple-300", bg: "bg-purple-950/30", label: "Sick Update Required — Off Roster" },
                { code: "Sick", color: "text-muted", bg: "", label: "Sick — Off Roster" },
              ].map((s) => (
                <div key={s.code} className={`flex items-center justify-between px-3 py-1.5 ${s.bg}`}>
                  <span className={`font-mono text-[11px] font-bold ${s.color}`}>{s.code}</span>
                  <span className="font-mono text-[10px] text-muted">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
