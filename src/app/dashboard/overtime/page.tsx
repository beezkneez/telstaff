"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface OvertimeData {
  date: string;
  userPlatoon: string;
  userName: string;
  userShift: { type: string; label: string; block: number };
  eligible: boolean;
  onShift: { dayShift: string | null; nightShift: string | null };
  allPlatoons: { platoon: string; shift: { type: string; label: string }; isWorking: boolean }[];
  callInData: {
    currentUp: string;
    totalMembers: number;
    userPosition: number | null;
    positionsAhead: number | null;
    nearbyMembers: { position: number; name: string }[];
  } | null;
  next6OffDetails: {
    date: string;
    eligible: boolean;
    dayShiftPlatoon: string | null;
    nightShiftPlatoon: string | null;
    statHoliday: string | null;
    statDaysAway: number;
  }[];
  prediction: {
    positionsAhead: number;
    last6OffTotal: number;
    todayOtwp: number | null;
    callThroughRatio: number;
    callThroughLabel: string;
    namesTheyWillCall: number;
    probability: "high" | "medium" | "low" | "unlikely";
    willGetCalled: boolean;
    explanation: string;
    nearStatHoliday: boolean;
    statHolidayName: string | null;
    dayOfWeek: string;
    scenarios: { label: string; acceptRate: string; namesCalledPerShift: number; namesCalledOver6Off: number; getsCalled: boolean; margin: number }[];
    factors: { name: string; value: string; impact: string }[];
  } | null;
  dataStale: boolean;
  shortfalls: {
    date: string;
    platoon: string;
    shift: "day" | "night";
    ffHoles: number;
    captainHoles: number;
    totalHoles: number;
  }[];
}

const PLATOON_COLORS: Record<string, string> = {
  "1": "platoon-1",
  "2": "platoon-2",
  "3": "platoon-3",
  "4": "platoon-4",
};

export default function OvertimePage() {
  const [data, setData] = useState<OvertimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    setLoading(true);
    fetch(`/api/overtime?date=${selectedDate}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6 animate-fade-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-[0.1em]">
              OVERTIME<span className="text-ember">//</span>INTEL
            </h1>
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted mt-1 uppercase">{displayDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-surface border border-border font-mono text-[11px] tracking-wider text-foreground cursor-pointer"
            />
            <button
              onClick={async () => {
                setLoading(true);
                // Force fresh OTWP scrape
                await fetch(`/api/overtime/otwp?date=${selectedDate}&force=true`);
                // Reload overtime data
                const res = await fetch(`/api/overtime?date=${selectedDate}`);
                const d = await res.json();
                setData(d);
                setLoading(false);
              }}
              className="px-3 py-2 bg-surface border border-border font-mono text-[10px] tracking-wider text-muted hover:text-ember hover:border-ember/40 uppercase transition-colors"
            >
              Update List
            </button>
            <Link
              href="/dashboard/overtime/analytics"
              className="px-3 py-2 bg-surface border border-border font-mono text-[10px] tracking-wider text-muted hover:text-ember hover:border-ember/40 uppercase transition-colors"
            >
              Analytics →
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <svg className="animate-spin h-6 w-6 text-ember" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="font-mono text-xs tracking-wider text-muted uppercase">Loading overtime data...</p>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Stale data warning */}
          {data.dataStale && (
            <div className="flex items-center justify-between p-3 bg-amber/5 border border-amber/20 animate-fade-slide-up">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber" />
                <span className="font-mono text-xs text-amber">Staffing data may be outdated — last scraped 8+ hours ago</span>
              </div>
              <button
                onClick={async () => {
                  setLoading(true);
                  // Just scrape today's on-shift platoon — fast single scrape
                  const todayPlatoon = data.onShift.dayShift || data.onShift.nightShift || "1";
                  await fetch("/api/stations/refresh", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ platoon: todayPlatoon, date: selectedDate }),
                  }).catch(() => {});
                  // Reload overtime data
                  const res = await fetch(`/api/overtime?date=${selectedDate}`);
                  const d = await res.json();
                  setData(d);
                  setLoading(false);
                }}
                className="px-3 py-1 font-mono text-[10px] tracking-wider uppercase bg-amber/20 border border-amber/30 text-amber hover:bg-amber/30 transition-all"
              >
                Refresh Now
              </button>
            </div>
          )}

          {/* Your Status */}
          <div className="bg-surface border border-border p-5 animate-fade-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">Your Status</h2>
              <span className="font-mono text-[10px] tracking-wider uppercase px-2 py-1"
                style={{ backgroundColor: `color-mix(in srgb, var(--${PLATOON_COLORS[data.userPlatoon]}) 15%, transparent)`, color: `var(--${PLATOON_COLORS[data.userPlatoon]})`, border: `1px solid color-mix(in srgb, var(--${PLATOON_COLORS[data.userPlatoon]}) 30%, transparent)` }}>
                PLT-{data.userPlatoon}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mb-1">Shift</p>
                <p className="font-mono text-sm text-foreground">{data.userShift.label}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mb-1">Status</p>
                <p className={`font-mono text-sm ${data.userShift.type === "day" || data.userShift.type === "night" ? "text-success" : "text-amber"}`}>
                  {data.userShift.type === "day" ? "On Shift (Day)" : data.userShift.type === "night" ? "On Shift (Night)" : "Off Duty"}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mb-1">OT Eligible</p>
                <p className={`font-mono text-sm ${data.eligible ? "text-ember" : "text-muted"}`}>{data.eligible ? "YES" : "No"}</p>
              </div>
            </div>
          </div>

          {/* Prediction */}
          {data.prediction && data.eligible && (
            <div className={`border p-5 animate-fade-slide-up delay-75 ${
              data.prediction.probability === "high" ? "bg-ember/5 border-ember/30"
                : data.prediction.probability === "medium" ? "bg-amber/5 border-amber/30"
                : "bg-surface border-border"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">Prediction</h2>
                <span className={`font-mono text-[10px] tracking-wider uppercase px-2 py-1 border ${
                  data.prediction.probability === "high" ? "bg-ember/20 text-ember border-ember/30"
                    : data.prediction.probability === "medium" ? "bg-amber/20 text-amber border-amber/30"
                    : "bg-surface-overlay text-muted border-border"
                }`}>
                  {data.prediction.probability} chance
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mb-1">You Are</p>
                  <p className="font-display text-2xl font-bold text-foreground">{data.prediction.positionsAhead} away</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mb-1">Last 6-Off OT</p>
                  <p className="font-display text-2xl font-bold text-ember">{data.prediction.last6OffTotal}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mb-1">Call-Through</p>
                  <p className="font-display text-2xl font-bold text-amber">{data.prediction.callThroughRatio}:1</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mb-1">Names Called</p>
                  <p className="font-display text-2xl font-bold">~{data.prediction.namesTheyWillCall}</p>
                </div>
              </div>
              <p className="font-mono text-sm text-foreground leading-relaxed">{data.prediction.explanation}</p>

              {/* Scenario Analysis */}
              {data.prediction.scenarios && data.prediction.scenarios.length > 0 && (
                <div className="mt-4 border border-border-subtle">
                  <div className="px-3 py-2 bg-surface-raised/50 border-b border-border-subtle flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">
                      What If — Tonight&apos;s Shift
                    </span>
                    <span className="font-mono text-[10px] text-ember">
                      {data.prediction.scenarios[0]?.namesCalledPerShift
                        ? `${Math.round(data.prediction.scenarios[0].namesCalledPerShift / 2)} holes to fill`
                        : ""}
                    </span>
                  </div>
                  <div className="divide-y divide-border-subtle">
                    {data.prediction.scenarios.map((sc, i) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-2 ${
                        sc.getsCalled ? "bg-ember/5" : ""
                      }`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-2 h-2 shrink-0 ${sc.getsCalled ? "bg-ember" : "bg-muted/30"}`} />
                          <div>
                            <span className="font-mono text-xs text-foreground">{sc.acceptRate}</span>
                            <span className="font-mono text-[10px] text-muted ml-2">{sc.label}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-[10px] text-muted">{sc.namesCalledPerShift} names</span>
                          {sc.getsCalled ? (
                            <span className="font-mono text-[11px] text-ember font-bold">YES (+{sc.margin})</span>
                          ) : (
                            <span className="font-mono text-[11px] text-muted">No ({sc.margin})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 py-2 bg-surface-raised/30">
                    <p className="font-mono text-[10px] text-muted leading-relaxed">
                      You&apos;re {data.prediction.positionsAhead} away. Tonight has {Math.round(data.prediction.scenarios[0]?.namesCalledPerShift / 2) || "?"} holes to fill.
                      {data.prediction.scenarios.filter((s) => s.getsCalled).length === 0
                        ? " Even at the worst acceptance rate, they won't reach you tonight."
                        : data.prediction.scenarios.filter((s) => s.getsCalled).length === data.prediction.scenarios.length
                          ? " Even at the best acceptance rate, they'll reach you. Expect the call."
                          : ` You get called in ${data.prediction.scenarios.filter((s) => s.getsCalled).length} of ${data.prediction.scenarios.length} scenarios. ${
                              (() => {
                                const first = data.prediction.scenarios.find((s) => s.getsCalled);
                                return first
                                  ? `The tipping point is ${first.acceptRate} — if only ${first.acceptRate.split("in ")[1]} out of every ${first.acceptRate.split("in ")[1]} people accept, they'll just barely reach you at position ${data.prediction.positionsAhead}.`
                                  : "";
                              })()
                            }`
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Next 6-Off Preview */}
          {data.next6OffDetails && data.next6OffDetails.length > 0 && (
            <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-150">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase mb-4">Next 6-Off</h2>
              <div className="space-y-1">
                {data.next6OffDetails.map((day, i) => {
                  const dateObj = new Date(day.date + "T12:00:00");
                  const dayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                  const dayShortfalls = data.shortfalls?.filter((sf) => sf.date === day.date && sf.shift === "day") || [];
                  const nightShortfalls = data.shortfalls?.filter((sf) => sf.date === day.date && sf.shift === "night") || [];
                  const dayShiftHoles = dayShortfalls.reduce((s, sf) => s + sf.ffHoles, 0);
                  const nightShiftHoles = nightShortfalls.reduce((s, sf) => s + sf.ffHoles, 0);
                  const hasDayData = dayShortfalls.length > 0;
                  const hasNightData = nightShortfalls.length > 0;

                  return (
                    <div key={day.date} className={`flex items-center justify-between px-3 py-2.5 ${day.eligible ? "bg-surface-raised/50" : "opacity-50"}`}>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-muted w-4">{i + 1}</span>
                        <span className="font-mono text-sm text-foreground">{dayLabel}</span>
                        {!day.eligible && <span className="font-mono text-[10px] text-muted tracking-wider">NOT ELIGIBLE</span>}
                        {day.statHoliday && day.statDaysAway === 0 && (
                          <span className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 bg-amber/10 text-amber border border-amber/20">{day.statHoliday}</span>
                        )}
                      </div>
                      {day.eligible && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-amber tracking-wider">DAY</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5"
                              style={{ backgroundColor: day.dayShiftPlatoon ? `color-mix(in srgb, var(--platoon-${day.dayShiftPlatoon}) 15%, transparent)` : undefined, color: day.dayShiftPlatoon ? `var(--platoon-${day.dayShiftPlatoon})` : undefined }}>
                              PLT-{day.dayShiftPlatoon}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-platoon-3 tracking-wider">NIGHT</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5"
                              style={{ backgroundColor: day.nightShiftPlatoon ? `color-mix(in srgb, var(--platoon-${day.nightShiftPlatoon}) 15%, transparent)` : undefined, color: day.nightShiftPlatoon ? `var(--platoon-${day.nightShiftPlatoon})` : undefined }}>
                              PLT-{day.nightShiftPlatoon}
                            </span>
                          </div>
                          {hasDayData && (
                            <span className={`font-mono text-[10px] font-bold ${dayShiftHoles > 0 ? "text-amber" : dayShiftHoles < 0 ? "text-success" : "text-muted"}`}>
                              {dayShiftHoles > 0 ? `${dayShiftHoles}D` : dayShiftHoles < 0 ? `+${Math.abs(dayShiftHoles)}D` : "= D"}
                            </span>
                          )}
                          {hasNightData && (
                            <span className={`font-mono text-[10px] font-bold ${nightShiftHoles > 0 ? "text-platoon-3" : nightShiftHoles < 0 ? "text-success" : "text-muted"}`}>
                              {nightShiftHoles > 0 ? `${nightShiftHoles}N` : nightShiftHoles < 0 ? `+${Math.abs(nightShiftHoles)}N` : "= N"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {data.next6OffDetails.some((d) => d.statHoliday) && (
                <div className="mt-3 p-3 bg-amber/5 border border-amber/20">
                  <p className="font-mono text-xs text-amber">
                    Stat holiday during your next 6-off — expect reduced overtime demand.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Call-In List */}
          {data.callInData && (
            <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-200">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase mb-4">Call-In List — PLT-{data.userPlatoon}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mb-1">Next Up</p>
                  <p className="font-mono text-sm text-ember font-bold">{data.callInData.currentUp}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mb-1">Your Position</p>
                  <p className="font-mono text-sm text-foreground">{data.callInData.userPosition ? `#${data.callInData.userPosition}` : "Not found"}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mb-1">Ahead of You</p>
                  <p className={`font-mono text-sm ${data.callInData.positionsAhead !== null && data.callInData.positionsAhead <= 15 ? "text-ember font-bold" : "text-foreground"}`}>
                    {data.callInData.positionsAhead ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mb-1">Total on List</p>
                  <p className="font-mono text-sm text-foreground">{data.callInData.totalMembers}</p>
                </div>
              </div>

              {/* Call-in list preview */}
              <div className="border border-border-subtle">
                <div className="px-3 py-2 bg-surface-raised border-b border-border-subtle flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">Call-In Order</span>
                  <span className="font-mono text-[10px] tracking-[0.2em] text-ember uppercase">{data.callInData.currentUp} is first up</span>
                </div>
                <div className="divide-y divide-border-subtle">
                  {data.callInData.nearbyMembers.map((m) => {
                    const isUser = data.callInData?.userPosition === m.position;
                    const isCurrentUp = m.name.toUpperCase() === data.callInData?.currentUp.toUpperCase();
                    return (
                      <div key={m.position} className={`flex items-center justify-between px-3 py-2 ${isUser ? "bg-ember/10 border-l-2 border-l-ember" : isCurrentUp ? "bg-success/10 border-l-2 border-l-success" : ""}`}>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-muted w-6">{m.position}</span>
                          <span className={`font-mono text-sm ${isUser ? "text-ember font-bold" : isCurrentUp ? "text-success font-bold" : "text-foreground"}`}>{m.name}</span>
                        </div>
                        {isUser && <span className="font-mono text-[10px] text-ember tracking-wider uppercase">You</span>}
                        {isCurrentUp && <span className="font-mono text-[10px] text-success tracking-wider uppercase">Next Up</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Link to analytics */}
          <Link
            href="/dashboard/overtime/analytics"
            className="block p-4 bg-surface border border-border hover:border-ember/40 transition-colors animate-fade-slide-up delay-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm text-foreground">OT Analytics & Deep Dive</p>
                <p className="font-mono text-[10px] text-muted mt-1">
                  OTWP history, YTD tallies, schedule holes breakdown, prediction factors
                </p>
              </div>
              <span className="font-mono text-ember text-lg">→</span>
            </div>
          </Link>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="font-mono text-sm text-muted">Failed to load overtime data. Make sure your profile is set up.</p>
        </div>
      )}
    </div>
  );
}
