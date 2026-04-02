"use client";

import { useState, useEffect } from "react";

interface UserInfo {
  id: string;
  email: string;
  isAdmin: boolean;
  useSystemCreds: boolean;
  hasTelestaffCreds: boolean;
  createdAt: string;
  profile: { name: string; platoon: string; homeStation: number; payrollNumber: string | null } | null;
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

function UserCard({ user, onUpdate, onDelete, onMessage }: {
  user: UserInfo;
  onUpdate: (id: string, data: Partial<UserInfo>) => void;
  onDelete: (id: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [edit, setEdit] = useState({
    name: user.profile?.name || "",
    email: user.email,
    platoon: user.profile?.platoon || "1",
    homeStation: String(user.profile?.homeStation || 1),
    payrollNumber: user.profile?.payrollNumber || "",
  });
  const [dbSearch, setDbSearch] = useState("");
  const [dbResults, setDbResults] = useState<{ lastName: string; firstName: string | null; platoon: string; position: number; payrollNumber: string | null }[]>([]);

  async function saveProfile() {
    await fetch("/api/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-profile",
        userId: user.id,
        ...edit,
      }),
    });
    onMessage("Profile updated");
  }

  return (
    <div className="px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-foreground">{user.profile?.name || user.email}</span>
            {user.isAdmin && <span className="font-mono text-[9px] px-1.5 py-0.5 bg-ember/20 text-ember border border-ember/30 tracking-wider">ADMIN</span>}
          </div>
          <div className="font-mono text-[10px] text-muted flex flex-wrap gap-3 mt-1">
            <span>{user.email}</span>
            {user.profile && (
              <>
                <span>PLT-{user.profile.platoon}</span>
                <span>STN-{String(user.profile.homeStation).padStart(2, "0")}</span>
                {user.profile.payrollNumber && <span>#{user.profile.payrollNumber}</span>}
              </>
            )}
            <span>Creds: {user.hasTelestaffCreds ? "Own" : user.useSystemCreds ? "System" : "None"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-1 font-mono text-[9px] tracking-wider border border-border text-muted hover:text-foreground hover:border-ember/40 transition-all"
          >
            {expanded ? "CLOSE" : "PROFILE"}
          </button>
          <button
            onClick={() => onUpdate(user.id, { useSystemCreds: !user.useSystemCreds })}
            className={`px-2 py-1 font-mono text-[9px] tracking-wider border transition-all ${user.useSystemCreds ? "bg-success/10 text-success border-success/30" : "bg-surface-overlay text-muted border-border"}`}
          >
            {user.useSystemCreds ? "SYS CREDS" : "OWN CREDS"}
          </button>
          {!user.isAdmin && (
            <button onClick={() => onDelete(user.id)} className="px-2 py-1 font-mono text-[9px] tracking-wider text-alert-red border border-alert-red/30 hover:bg-alert-red/10 transition-all">
              DELETE
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 p-3 border border-border-subtle bg-surface-raised/30 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-1">Name</label>
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="w-full px-2 py-1.5 bg-background border border-border font-mono text-xs text-foreground" />
            </div>
            <div>
              <label className="block font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-1">Email</label>
              <input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} className="w-full px-2 py-1.5 bg-background border border-border font-mono text-xs text-foreground" />
            </div>
            <div>
              <label className="block font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-1">Payroll #</label>
              <input value={edit.payrollNumber} onChange={(e) => setEdit({ ...edit, payrollNumber: e.target.value })} className="w-full px-2 py-1.5 bg-background border border-border font-mono text-xs text-foreground" />
            </div>
            <div>
              <label className="block font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-1">Platoon</label>
              <select value={edit.platoon} onChange={(e) => setEdit({ ...edit, platoon: e.target.value })} className="w-full px-2 py-1.5 bg-background border border-border font-mono text-xs text-foreground">
                {["1", "2", "3", "4"].map((p) => <option key={p} value={p}>Platoon {p}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-1">Home Station</label>
              <select value={edit.homeStation} onChange={(e) => setEdit({ ...edit, homeStation: e.target.value })} className="w-full px-2 py-1.5 bg-background border border-border font-mono text-xs text-foreground">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((s) => <option key={s} value={s}>Station {s}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={saveProfile} className="px-4 py-1.5 bg-ember hover:bg-ember-glow text-white font-mono text-[10px] tracking-wider uppercase transition-all">
                Save
              </button>
            </div>
          </div>
          {/* Link to DB record */}
          <div className="mt-3 pt-3 border-t border-border-subtle">
            <label className="block font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-1">Link to Database Record</label>
            <div className="relative">
              <input
                type="text"
                value={dbSearch}
                onChange={async (e) => {
                  setDbSearch(e.target.value);
                  if (e.target.value.length < 2) { setDbResults([]); return; }
                  const res = await fetch(`/api/admin/callin?action=search&q=${encodeURIComponent(e.target.value)}`);
                  if (res.ok) setDbResults(await res.json());
                }}
                placeholder="Search database by name..."
                className="w-full px-3 py-2 bg-background border border-border font-mono text-xs text-foreground placeholder:text-muted/50"
              />
              {dbResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-raised border border-border z-50 max-h-40 overflow-y-auto">
                  {dbResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={async () => {
                        setEdit({
                          ...edit,
                          name: `${r.firstName || ""} ${r.lastName}`.trim(),
                          platoon: r.platoon,
                          payrollNumber: r.payrollNumber || "",
                        });
                        setDbSearch("");
                        setDbResults([]);
                        // Also save immediately
                        await fetch("/api/admin", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "update-profile",
                            userId: user.id,
                            name: `${r.firstName || ""} ${r.lastName}`.trim(),
                            platoon: r.platoon,
                            payrollNumber: r.payrollNumber || "",
                          }),
                        });
                        onMessage(`Linked to ${r.lastName}, ${r.firstName} (PLT-${r.platoon})`);
                      }}
                      className="w-full text-left px-3 py-2 font-mono text-xs hover:bg-surface-overlay transition-colors flex justify-between"
                    >
                      <span>{r.lastName}{r.firstName ? `, ${r.firstName}` : ""}</span>
                      <div className="flex gap-2">
                        <span style={{ color: `var(--platoon-${r.platoon})` }}>PLT-{r.platoon}</span>
                        {r.payrollNumber && <span className="text-muted">#{r.payrollNumber}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="font-mono text-[9px] text-muted mt-2">
            ID: {user.id} · Created: {new Date(user.createdAt).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
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
      fetch("/api/admin/callin?action=stats").then((r) => r.json()),
    ])
      .then(([u, s, c, ci]) => {
        if (u.error) throw new Error(u.error);
        setUsers(u);
        setSettings(s);
        setCacheStats(c);
        if (Array.isArray(ci)) setCallInStates(ci);
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

  const [scraping, setScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [callInStates, setCallInStates] = useState<{ platoon: string; members: number; state: { currentUpPos: number; lastOtwpName: string | null } | null; currentName: string | null }[]>([]);
  const [nextUpOverrides, setNextUpOverrides] = useState<Record<string, string>>({});
  const [nextUpSuggestions, setNextUpSuggestions] = useState<Record<string, { position: number; lastName: string; firstName: string | null }[]>>({});

  async function triggerScrape() {
    setScraping(true);
    setScrapeProgress(0);
    await fetch("/api/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trigger-scrape" }),
    });
    showMessage("Scrape started — tracking progress");

    // Poll cache stats to track progress (17 days × 4 platoons = 68 roster entries expected)
    const expectedTotal = 68;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/admin?action=cache-stats");
        const stats = await res.json();
        const progress = Math.min(100, Math.round((stats.staffingEntries / expectedTotal) * 100));
        setScrapeProgress(progress);
        setCacheStats(stats);
        if (progress >= 95) {
          clearInterval(interval);
          setScraping(false);
          setScrapeProgress(100);
          showMessage("Scrape complete!");
        }
      } catch {}
    }, 5000);

    // Safety timeout after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
      setScraping(false);
    }, 600000);
  }

  async function searchNextUp(platoon: string, query: string) {
    setNextUpOverrides((prev) => ({ ...prev, [platoon]: query }));
    if (query.length < 2) { setNextUpSuggestions((prev) => ({ ...prev, [platoon]: [] })); return; }
    const res = await fetch(`/api/admin/callin?action=search&q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      setNextUpSuggestions((prev) => ({ ...prev, [platoon]: data.filter((m: { platoon: string }) => m.platoon === platoon) }));
    }
  }

  async function setNextUp(platoon: string, position: number, name: string) {
    await fetch("/api/admin/callin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set-current-up", platoon, position }),
    });
    setNextUpOverrides((prev) => ({ ...prev, [platoon]: "" }));
    setNextUpSuggestions((prev) => ({ ...prev, [platoon]: [] }));
    // Refresh states
    const ci = await fetch("/api/admin/callin?action=stats").then((r) => r.json());
    if (Array.isArray(ci)) setCallInStates(ci);
    showMessage(`PLT-${platoon} next up set to ${name} (pos ${position})`);
  }

  async function matchUsers() {
    const res = await fetch("/api/admin/callin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "match-users" }),
    });
    const data = await res.json();
    showMessage(`Matched ${data.matched} of ${data.total} users to call-in records`);
  }

  async function enrichCallInList() {
    const res = await fetch("/api/admin/callin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enrich-roster" }),
    });
    const data = await res.json();
    showMessage(`Updated ${data.updated} members with first names. ${data.notFound?.length || 0} not found in roster.`);
  }

  async function importCallInList() {
    if (!confirm("Import call-in list from Google Sheet? This will set up the database.")) return;
    const res = await fetch("/api/admin/callin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import-sheet" }),
    });
    const data = await res.json();
    showMessage(`Imported ${data.imported} members from Google Sheet`);
  }

  const [nameSearch, setNameSearch] = useState("");
  const [nameResults, setNameResults] = useState<{ lastName: string; firstName: string | null; platoon: string; position: number; payrollNumber: string | null }[]>([]);

  async function searchName(query: string) {
    setNameSearch(query);
    if (query.length < 2) { setNameResults([]); return; }
    const res = await fetch(`/api/admin/callin?action=search&q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      setNameResults(data);
    }
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
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerScrape}
                  disabled={scraping}
                  className="px-3 py-1.5 bg-ember hover:bg-ember-glow text-white font-mono text-[10px] tracking-wider uppercase transition-all disabled:opacity-50"
                >
                  {scraping ? `${scrapeProgress}%` : "Run Now"}
                </button>
                <button
                  onClick={saveSettings}
                  className="px-3 py-1.5 bg-surface-overlay border border-border text-foreground font-mono text-[10px] tracking-wider uppercase hover:border-ember/40 transition-all"
                >
                  Save
                </button>
                {scraping && (
                  <div className="flex-1 max-w-[200px] h-2 bg-surface-overlay overflow-hidden">
                    <div
                      className="h-full bg-ember transition-all duration-500"
                      style={{ width: `${scrapeProgress}%` }}
                    />
                  </div>
                )}
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
                  onClick={importCallInList}
                  className="px-3 py-1.5 bg-success/20 border border-success/30 text-success font-mono text-[10px] tracking-wider uppercase hover:bg-success/30 transition-all"
                >
                  Import Call-In List
                </button>
                <button
                  onClick={matchUsers}
                  className="px-3 py-1.5 bg-amber/20 border border-amber/30 text-amber font-mono text-[10px] tracking-wider uppercase hover:bg-amber/30 transition-all"
                >
                  Match Users
                </button>
                <button
                  onClick={enrichCallInList}
                  className="px-3 py-1.5 bg-platoon-3/20 border border-platoon-3/30 text-platoon-3 font-mono text-[10px] tracking-wider uppercase hover:bg-platoon-3/30 transition-all"
                >
                  Add First Names
                </button>
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

        {/* Next Up Override */}
        {callInStates.length > 0 && (
          <div className="bg-surface border border-border animate-fade-slide-up delay-200">
            <div className="px-4 py-3 border-b border-border bg-surface-raised/50">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">
                Next Up — By Platoon
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {["1", "2", "3", "4"].map((plt) => {
                const ci = callInStates.find((c) => c.platoon === plt);
                const currentPos = ci?.state?.currentUpPos || 1;
                const suggestions = nextUpSuggestions[plt] || [];

                return (
                  <div key={plt} className="border border-border-subtle p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3" style={{ backgroundColor: `var(--platoon-${plt})` }} />
                        <span className="font-mono text-sm font-bold">PLT-{plt}</span>
                        <span className="font-mono text-[10px] text-muted">{ci?.members || 0} members</span>
                      </div>
                      <span className="font-mono text-xs text-ember">
                        Next up: {ci?.currentName || `Pos #${currentPos}`}
                        <span className="text-muted ml-1">(#{currentPos})</span>
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={nextUpOverrides[plt] || ""}
                        onChange={(e) => searchNextUp(plt, e.target.value)}
                        placeholder="Type name to override next up..."
                        className="w-full px-3 py-2 bg-background border border-border font-mono text-xs text-foreground placeholder:text-muted/50"
                      />
                      {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-raised border border-border z-50 max-h-40 overflow-y-auto">
                          {suggestions.map((s) => (
                            <button
                              key={s.position}
                              onClick={() => setNextUp(plt, s.position, `${s.lastName}${s.firstName ? `, ${s.firstName}` : ""}`)}
                              className="w-full text-left px-3 py-2 font-mono text-xs hover:bg-surface-overlay transition-colors flex justify-between"
                            >
                              <span>{s.lastName}{s.firstName ? `, ${s.firstName}` : ""}</span>
                              <span className="text-muted">Pos #{s.position}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Name Search */}
        <div className="bg-surface border border-border animate-fade-slide-up delay-250">
          <div className="px-4 py-3 border-b border-border bg-surface-raised/50">
            <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">
              Staff Search
            </h2>
          </div>
          <div className="p-4">
            <input
              type="text"
              value={nameSearch}
              onChange={(e) => searchName(e.target.value)}
              placeholder="Type a name..."
              className="w-full px-4 py-3 bg-background border border-border font-mono text-sm text-foreground placeholder:text-muted/50 focus:border-ember/50 mb-3"
            />
            {nameResults.length > 0 && (
              <div className="divide-y divide-border-subtle border border-border-subtle">
                {nameResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-foreground">
                        {r.lastName}{r.firstName ? `, ${r.firstName}` : ""}
                      </span>
                      {r.payrollNumber && (
                        <span className="font-mono text-[10px] text-muted">#{r.payrollNumber}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-[10px] tracking-wider px-1.5 py-0.5"
                        style={{
                          backgroundColor: `color-mix(in srgb, var(--platoon-${r.platoon}) 15%, transparent)`,
                          color: `var(--platoon-${r.platoon})`,
                        }}
                      >
                        PLT-{r.platoon}
                      </span>
                      <span className="font-mono text-[10px] text-muted">Pos #{r.position}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {nameSearch.length >= 2 && nameResults.length === 0 && (
              <p className="font-mono text-xs text-muted">No results found</p>
            )}
          </div>
        </div>

        {/* Users */}
        <div className="bg-surface border border-border animate-fade-slide-up delay-300">
          <div className="px-4 py-3 border-b border-border bg-surface-raised/50 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">
              Users ({users.length})
            </h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {users.map((user) => (
              <UserCard key={user.id} user={user} onUpdate={updateUser} onDelete={deleteUser} onMessage={showMessage} />
            ))}
                      DELETE
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
