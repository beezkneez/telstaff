"use client";

import { useEffect, useMemo, useState } from "react";

interface Member {
  id: string;
  platoon: string;
  position: number;
  lastName: string;
  firstName: string | null;
  payrollNumber: string | null;
}

type Grouped = Record<string, Member[]>;

export default function CallInReviewPage() {
  const [grouped, setGrouped] = useState<Grouped>({ "1": [], "2": [], "3": [], "4": [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [edits, setEdits] = useState<Record<string, { lastName: string; firstName: string; payrollNumber: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [hideComplete, setHideComplete] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/admin/callin?action=list-all")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setGrouped(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2500);
  }

  function getEdit(m: Member) {
    return (
      edits[m.id] || {
        lastName: m.lastName,
        firstName: m.firstName || "",
        payrollNumber: m.payrollNumber || "",
      }
    );
  }

  function setEdit(m: Member, patch: Partial<{ lastName: string; firstName: string; payrollNumber: string }>) {
    setEdits((prev) => {
      const base = prev[m.id] || {
        lastName: m.lastName,
        firstName: m.firstName || "",
        payrollNumber: m.payrollNumber || "",
      };
      return { ...prev, [m.id]: { ...base, ...patch } };
    });
  }

  function isDirty(m: Member) {
    const e = edits[m.id];
    if (!e) return false;
    return (
      e.lastName !== m.lastName ||
      e.firstName !== (m.firstName || "") ||
      e.payrollNumber !== (m.payrollNumber || "")
    );
  }

  async function save(m: Member) {
    const e = getEdit(m);
    setSavingId(m.id);
    try {
      const res = await fetch("/api/admin/callin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-member",
          id: m.id,
          lastName: e.lastName,
          firstName: e.firstName || null,
          payrollNumber: e.payrollNumber || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save failed");
      const updated: Member = data.member;
      setGrouped((prev) => {
        const copy: Grouped = { ...prev };
        copy[m.platoon] = copy[m.platoon].map((x) => (x.id === m.id ? { ...x, ...updated } : x));
        return copy;
      });
      setEdits((prev) => {
        const copy = { ...prev };
        delete copy[m.id];
        return copy;
      });
      showMessage(`Saved ${updated.lastName}`);
    } catch (err) {
      showMessage(`Error: ${(err as Error).message}`);
    } finally {
      setSavingId(null);
    }
  }

  const counts = useMemo(() => {
    const out: Record<string, { total: number; missingFirst: number; missingPayroll: number }> = {};
    for (const plt of ["1", "2", "3", "4"]) {
      const list = grouped[plt] || [];
      out[plt] = {
        total: list.length,
        missingFirst: list.filter((m) => !m.firstName).length,
        missingPayroll: list.filter((m) => !m.payrollNumber).length,
      };
    }
    return out;
  }, [grouped]);

  function exportCsv() {
    const rows = [["Platoon", "Position", "LastName", "FirstName", "PayrollNumber"]];
    for (const plt of ["1", "2", "3", "4"]) {
      for (const m of grouped[plt] || []) {
        rows.push([plt, String(m.position), m.lastName, m.firstName || "", m.payrollNumber || ""]);
      }
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `callin-list-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="p-4 bg-alert-red/10 border border-alert-red/20 text-alert-red font-mono text-sm">{error}</div>
      </div>
    );
  }

  const filterLower = filter.trim().toLowerCase();

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6 animate-fade-slide-up">
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-[0.1em]">
          CALL-IN<span className="text-ember">//</span>REVIEW
        </h1>
        <p className="font-mono text-[13px] tracking-[0.15em] text-muted mt-1 uppercase">
          All platoons in list order — review auto-filled names
        </p>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 text-success font-mono text-xs tracking-wider animate-fade-in">
          {message}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name or payroll..."
          className="px-3 py-2 bg-background border border-border font-mono text-xs text-foreground placeholder:text-muted/50 flex-1 min-w-[200px]"
        />
        <label className="flex items-center gap-2 font-mono text-[12px] tracking-wider text-muted uppercase cursor-pointer">
          <input type="checkbox" checked={hideComplete} onChange={(e) => setHideComplete(e.target.checked)} />
          Only missing first names
        </label>
        <button
          onClick={exportCsv}
          className="px-3 py-2 bg-surface-overlay border border-border text-foreground font-mono text-[12px] tracking-wider uppercase hover:border-ember/40 transition-all"
        >
          Export CSV
        </button>
        <button
          onClick={() => window.print()}
          className="px-3 py-2 bg-surface-overlay border border-border text-foreground font-mono text-[12px] tracking-wider uppercase hover:border-ember/40 transition-all"
        >
          Print
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {["1", "2", "3", "4"].map((plt) => {
          const list = (grouped[plt] || []).filter((m) => {
            if (hideComplete && m.firstName) return false;
            if (!filterLower) return true;
            const hay = `${m.lastName} ${m.firstName || ""} ${m.payrollNumber || ""}`.toLowerCase();
            return hay.includes(filterLower);
          });
          return (
            <div key={plt} className="bg-surface border border-border">
              <div
                className="px-3 py-2 border-b border-border flex items-center justify-between"
                style={{ backgroundColor: `color-mix(in srgb, var(--platoon-${plt}) 10%, transparent)` }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3" style={{ backgroundColor: `var(--platoon-${plt})` }} />
                  <span className="font-display font-bold tracking-[0.15em]">PLATOON {plt}</span>
                </div>
                <div className="font-mono text-[11px] text-muted tracking-wider">
                  {counts[plt].total} total · <span className="text-alert-red">{counts[plt].missingFirst}</span> missing
                </div>
              </div>
              <div className="divide-y divide-border-subtle">
                {list.length === 0 && (
                  <div className="px-3 py-6 font-mono text-xs text-muted text-center">No members</div>
                )}
                {list.map((m) => {
                  const e = getEdit(m);
                  const dirty = isDirty(m);
                  const missing = !m.firstName;
                  return (
                    <div
                      key={m.id}
                      className={`px-2 py-1.5 flex items-center gap-1.5 ${missing ? "bg-alert-red/5" : ""}`}
                    >
                      <span className="font-mono text-[11px] text-muted w-8 text-right shrink-0">{m.position}</span>
                      <input
                        value={e.lastName}
                        onChange={(ev) => setEdit(m, { lastName: ev.target.value })}
                        className="px-1.5 py-1 bg-background border border-border-subtle font-mono text-xs text-foreground w-[95px]"
                        placeholder="LASTNAME"
                      />
                      <input
                        value={e.firstName}
                        onChange={(ev) => setEdit(m, { firstName: ev.target.value })}
                        className={`px-1.5 py-1 bg-background border font-mono text-xs text-foreground flex-1 min-w-0 ${
                          missing && !e.firstName ? "border-alert-red/40" : "border-border-subtle"
                        }`}
                        placeholder="First"
                      />
                      <input
                        value={e.payrollNumber}
                        onChange={(ev) => setEdit(m, { payrollNumber: ev.target.value })}
                        className="px-1.5 py-1 bg-background border border-border-subtle font-mono text-[11px] text-muted w-[70px]"
                        placeholder="#"
                      />
                      <button
                        onClick={() => save(m)}
                        disabled={!dirty || savingId === m.id}
                        className={`px-2 py-1 font-mono text-[10px] tracking-wider uppercase border transition-all ${
                          dirty
                            ? "bg-ember/20 border-ember/40 text-ember hover:bg-ember/30"
                            : "bg-surface-overlay border-border-subtle text-muted/40"
                        } disabled:opacity-40`}
                      >
                        {savingId === m.id ? "..." : "Save"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
