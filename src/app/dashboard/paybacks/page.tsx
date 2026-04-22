"use client";

import { useState, useEffect } from "react";

interface PaybackEntry {
  date: string;
  name: string;
  fullName: string;
  details: string;
  platoon?: string;
}

interface PaybacksData {
  owesMe: PaybackEntry[];
  iOwe: PaybackEntry[];
}

export default function PaybacksPage() {
  const [data, setData] = useState<PaybacksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/paybacks")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6 animate-fade-slide-up">
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-[0.1em]">
          PAY<span className="text-ember">//</span>BACKS
        </h1>
        <p className="font-mono text-[13px] tracking-[0.15em] text-muted mt-1 uppercase">
          Trade shifts owed to you and by you
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <svg
            className="animate-spin h-6 w-6 text-ember"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="font-mono text-xs tracking-wider text-muted uppercase">
            Scraping Telestaff dashboard...
          </p>
        </div>
      ) : error ? (
        <div className="p-4 bg-alert-red/10 border border-alert-red/20 text-alert-red font-mono text-sm">
          {error}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Owes Me */}
          <div className="bg-surface border border-border animate-fade-slide-up">
            <div className="px-4 py-3 border-b border-border bg-surface-raised/50 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">
                Owes Me
              </h2>
              <span className="font-mono text-[12px] tracking-wider text-success">
                {data.owesMe.length} {data.owesMe.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            {data.owesMe.length === 0 ? (
              <div className="p-6 text-center">
                <p className="font-mono text-xs text-muted">No one owes you shifts</p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {data.owesMe.map((entry, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-foreground font-medium">
                          {entry.name}
                        </span>
                        {entry.platoon && (
                          <span
                            className="font-mono text-[11px] tracking-wider px-1.5 py-0.5"
                            style={{
                              backgroundColor: `color-mix(in srgb, var(--platoon-${entry.platoon}) 15%, transparent)`,
                              color: `var(--platoon-${entry.platoon})`,
                              border: `1px solid color-mix(in srgb, var(--platoon-${entry.platoon}) 30%, transparent)`,
                            }}
                          >
                            PLT-{entry.platoon}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] tracking-wider text-muted uppercase">
                        {entry.date}
                      </span>
                    </div>
                    <p className="font-mono text-[13px] text-muted">
                      {entry.details}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* I Owe */}
          <div className="bg-surface border border-border animate-fade-slide-up delay-150">
            <div className="px-4 py-3 border-b border-border bg-surface-raised/50 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">
                I Owe
              </h2>
              <span className="font-mono text-[12px] tracking-wider text-ember">
                {data.iOwe.length} {data.iOwe.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            {data.iOwe.length === 0 ? (
              <div className="p-6 text-center">
                <p className="font-mono text-xs text-muted">You don&apos;t owe any shifts</p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {data.iOwe.map((entry, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-foreground font-medium">
                          {entry.name}
                        </span>
                        {entry.platoon && (
                          <span
                            className="font-mono text-[11px] tracking-wider px-1.5 py-0.5"
                            style={{
                              backgroundColor: `color-mix(in srgb, var(--platoon-${entry.platoon}) 15%, transparent)`,
                              color: `var(--platoon-${entry.platoon})`,
                              border: `1px solid color-mix(in srgb, var(--platoon-${entry.platoon}) 30%, transparent)`,
                            }}
                          >
                            PLT-{entry.platoon}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] tracking-wider text-muted uppercase">
                        {entry.date}
                      </span>
                    </div>
                    <p className="font-mono text-[13px] text-muted">
                      {entry.details}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-4 p-4 bg-surface-raised/50 border border-border-subtle animate-fade-slide-up delay-300">
        <p className="font-mono text-[12px] tracking-wider text-muted leading-relaxed">
          Data scraped from your Telestaff dashboard. Cached for 15 minutes.
        </p>
      </div>
    </div>
  );
}
