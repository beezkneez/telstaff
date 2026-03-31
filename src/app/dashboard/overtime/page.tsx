"use client";

import { useState, useEffect } from "react";

interface OvertimeData {
  date: string;
  userPlatoon: string;
  userName: string;
  userShift: { type: string; label: string; block: number };
  eligible: boolean;
  onShift: { dayShift: string | null; nightShift: string | null };
  allPlatoons: {
    platoon: string;
    shift: { type: string; label: string };
    isWorking: boolean;
  }[];
  callInData: {
    currentUp: string;
    totalMembers: number;
    userPosition: number | null;
    positionsAhead: number | null;
    nearbyMembers: { position: number; name: string }[];
  } | null;
  sixOffDetails: {
    date: string;
    eligible: boolean;
    dayShiftPlatoon: string | null;
    nightShiftPlatoon: string | null;
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
    factors: { name: string; value: string; impact: string }[];
  } | null;
  ytdNeeded: { platoon: string; total: number }[];
  ytdWorked: { platoon: string; total: number }[];
  shortfalls: {
    date: string;
    platoon: string;
    shift: "day" | "night";
    requiredCrew: number;
    actualCrew: number;
    holes: number;
    truckBreakdown: { truck: string; type: string; required: number; actual: number; short: number }[];
  }[];
}

interface OTWPResult {
  date: string;
  dayShiftPlatoon: string;
  dayShiftCount: number;
  nightShiftPlatoon: string;
  nightShiftCount: number;
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
  const [otwpData, setOtwpData] = useState<OTWPResult[]>([]);
  const [otwpLoading, setOtwpLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/overtime?date=${selectedDate}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        // Trigger OTWP scrape in background
        setOtwpLoading(true);
        fetch(`/api/overtime/otwp?date=${selectedDate}`)
          .then((r) => r.json())
          .then((otwp) => {
            if (otwp.results) setOtwpData(otwp.results);
          })
          .catch(() => {})
          .finally(() => setOtwpLoading(false));
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const displayDate = new Date(
    selectedDate + "T12:00:00"
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
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
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted mt-1 uppercase">
              {displayDate}
            </p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-surface border border-border font-mono text-[11px] tracking-wider text-foreground cursor-pointer"
          />
        </div>
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
            Loading overtime data...
          </p>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Your Status */}
          <div className="bg-surface border border-border p-5 animate-fade-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">
                Your Status
              </h2>
              <span
                className="font-mono text-[10px] tracking-wider uppercase px-2 py-1"
                style={{
                  backgroundColor: `color-mix(in srgb, var(--${PLATOON_COLORS[data.userPlatoon]}) 15%, transparent)`,
                  color: `var(--${PLATOON_COLORS[data.userPlatoon]})`,
                  border: `1px solid color-mix(in srgb, var(--${PLATOON_COLORS[data.userPlatoon]}) 30%, transparent)`,
                }}
              >
                PLT-{data.userPlatoon}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-1">
                  Shift
                </p>
                <p className="font-mono text-sm text-foreground">
                  {data.userShift.label}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-1">
                  Status
                </p>
                <p className={`font-mono text-sm ${
                  data.userShift.type === "day" || data.userShift.type === "night"
                    ? "text-success"
                    : "text-amber"
                }`}>
                  {data.userShift.type === "day"
                    ? "On Shift (Day)"
                    : data.userShift.type === "night"
                      ? "On Shift (Night)"
                      : "Off Duty"}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-1">
                  OT Eligible
                </p>
                <p className={`font-mono text-sm ${data.eligible ? "text-ember" : "text-muted"}`}>
                  {data.eligible ? "YES — Can be called" : "No"}
                </p>
              </div>
            </div>
          </div>

          {/* Prediction */}
          {data.prediction && data.eligible && (
            <div className={`border p-5 animate-fade-slide-up delay-75 ${
              data.prediction.probability === "high"
                ? "bg-ember/5 border-ember/30"
                : data.prediction.probability === "medium"
                  ? "bg-amber/5 border-amber/30"
                  : "bg-surface border-border"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">
                  Prediction
                </h2>
                <span className={`font-mono text-[10px] tracking-wider uppercase px-2 py-1 border ${
                  data.prediction.probability === "high"
                    ? "bg-ember/20 text-ember border-ember/30"
                    : data.prediction.probability === "medium"
                      ? "bg-amber/20 text-amber border-amber/30"
                      : data.prediction.probability === "low"
                        ? "bg-surface-overlay text-muted border-border"
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

              <p className="font-mono text-sm text-foreground leading-relaxed">
                {data.prediction.explanation}
              </p>

              {/* Factors breakdown */}
              <div className="mt-4 border border-border-subtle">
                <div className="px-3 py-2 bg-surface-raised/50 border-b border-border-subtle">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">Prediction Factors</span>
                </div>
                <div className="divide-y divide-border-subtle">
                  {data.prediction.factors.map((f, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2">
                      <span className="font-mono text-xs text-muted">{f.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-foreground font-medium">{f.value}</span>
                        <span className="font-mono text-[10px] text-muted hidden sm:block">{f.impact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Staffing Holes */}
          {data.shortfalls && data.shortfalls.length > 0 && (
            <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-100">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase mb-4">
                Schedule Holes — Your Call-In Block
              </h2>
              <div className="space-y-3">
                {data.shortfalls.map((sf, i) => {
                  const dateLabel = new Date(sf.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                  return (
                    <div key={i} className="border border-border-subtle">
                      <div className="px-3 py-2 bg-surface-raised/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-foreground">{dateLabel}</span>
                          <span className={`font-mono text-[10px] tracking-wider uppercase ${sf.shift === "day" ? "text-amber" : "text-platoon-3"}`}>
                            {sf.shift} shift
                          </span>
                          <span
                            className="font-mono text-[10px] px-1.5 py-0.5"
                            style={{
                              backgroundColor: `color-mix(in srgb, var(--platoon-${sf.platoon}) 15%, transparent)`,
                              color: `var(--platoon-${sf.platoon})`,
                            }}
                          >
                            PLT-{sf.platoon}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted">{sf.actualCrew}/{sf.requiredCrew}</span>
                          <span className="font-mono text-sm text-ember font-bold">{sf.holes} holes</span>
                        </div>
                      </div>
                      {sf.truckBreakdown.length > 0 && (
                        <div className="px-3 py-2 divide-y divide-border-subtle">
                          {sf.truckBreakdown.slice(0, 8).map((t, j) => (
                            <div key={j} className="flex items-center justify-between py-1">
                              <span className="font-mono text-[11px] text-muted">{t.truck}</span>
                              <span className="font-mono text-[11px] text-ember">
                                {t.actual}/{t.required} ({t.short} short)
                              </span>
                            </div>
                          ))}
                          {sf.truckBreakdown.length > 8 && (
                            <p className="font-mono text-[10px] text-muted py-1">
                              +{sf.truckBreakdown.length - 8} more trucks short
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="font-mono text-[10px] text-muted tracking-wider mt-3">
                Holes = required crew per truck minus actual assigned. These are the OT spots that need filling.
              </p>
            </div>
          )}

          {/* Running Tally */}
          {otwpData.length > 0 && (
            <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-100">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase mb-4">
                OT Call-In Tally — Last 6-Off
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["1", "2", "3", "4"].map((plt) => {
                  const dayTotal = otwpData
                    .filter((o) => o.dayShiftPlatoon === plt)
                    .reduce((s, o) => s + o.dayShiftCount, 0);
                  const nightTotal = otwpData
                    .filter((o) => o.nightShiftPlatoon === plt)
                    .reduce((s, o) => s + o.nightShiftCount, 0);
                  const total = dayTotal + nightTotal;
                  return (
                    <div key={plt} className="p-3 border border-border-subtle">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-2.5 h-2.5"
                          style={{ backgroundColor: `var(--platoon-${plt})` }}
                        />
                        <span className="font-mono text-[10px] tracking-wider uppercase">
                          PLT-{plt}
                        </span>
                      </div>
                      <p className="font-display text-2xl font-bold" style={{ color: `var(--platoon-${plt})` }}>
                        {total}
                      </p>
                      <p className="font-mono text-[9px] text-muted mt-1">
                        {dayTotal > 0 && `${dayTotal} day`}{dayTotal > 0 && nightTotal > 0 && " / "}{nightTotal > 0 && `${nightTotal} night`}
                        {total === 0 && "0 call-ins"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Last 6-Off Period */}
          {data.sixOffDetails && data.sixOffDetails.length > 0 && (
            <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">
                  Last 6-Off — OT Shifts
                </h2>
                {otwpLoading && (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-3 w-3 text-ember" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="font-mono text-[9px] text-ember tracking-wider uppercase">Scraping OTWP...</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {data.sixOffDetails.map((day, i) => {
                  const dateObj = new Date(day.date + "T12:00:00");
                  const dayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                  const isToday = day.date === selectedDate;
                  const otwp = otwpData.find((o) => o.date === day.date);
                  return (
                    <div key={day.date} className={`flex items-center justify-between px-3 py-2.5 ${isToday ? "bg-ember/10 border-l-2 border-l-ember" : day.eligible ? "bg-surface-raised/50" : "opacity-50"}`}>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-muted w-4">{i + 1}</span>
                        <span className={`font-mono text-xs ${isToday ? "text-ember font-bold" : "text-foreground"}`}>{dayLabel}</span>
                        {!day.eligible && <span className="font-mono text-[9px] text-muted tracking-wider">NOT ELIGIBLE</span>}
                        {isToday && <span className="font-mono text-[9px] text-ember tracking-wider uppercase">Today</span>}
                      </div>
                      {day.eligible && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] text-amber tracking-wider">DAY</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5" style={{ backgroundColor: day.dayShiftPlatoon ? `color-mix(in srgb, var(--platoon-${day.dayShiftPlatoon}) 15%, transparent)` : undefined, color: day.dayShiftPlatoon ? `var(--platoon-${day.dayShiftPlatoon})` : undefined }}>PLT-{day.dayShiftPlatoon}</span>
                            {otwp ? <span className="font-mono text-[11px] text-ember font-bold ml-1">{otwp.dayShiftCount}</span> : otwpLoading ? <span className="font-mono text-[9px] text-muted ml-1">...</span> : null}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] text-platoon-3 tracking-wider">NIGHT</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5" style={{ backgroundColor: day.nightShiftPlatoon ? `color-mix(in srgb, var(--platoon-${day.nightShiftPlatoon}) 15%, transparent)` : undefined, color: day.nightShiftPlatoon ? `var(--platoon-${day.nightShiftPlatoon})` : undefined }}>PLT-{day.nightShiftPlatoon}</span>
                            {otwp ? <span className="font-mono text-[11px] text-ember font-bold ml-1">{otwp.nightShiftCount}</span> : otwpLoading ? <span className="font-mono text-[9px] text-muted ml-1">...</span> : null}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {otwpData.length > 0 && (
                <div className="mt-3 p-3 bg-surface-raised border border-border-subtle">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase">Total OT Call-Ins</span>
                    <div className="flex gap-4">
                      <span className="font-mono text-xs"><span className="text-amber">Day:</span> <span className="text-ember font-bold">{otwpData.reduce((s, o) => s + o.dayShiftCount, 0)}</span></span>
                      <span className="font-mono text-xs"><span className="text-platoon-3">Night:</span> <span className="text-ember font-bold">{otwpData.reduce((s, o) => s + o.nightShiftCount, 0)}</span></span>
                      <span className="font-mono text-xs text-foreground font-bold">Total: {otwpData.reduce((s, o) => s + o.dayShiftCount + o.nightShiftCount, 0)}</span>
                    </div>
                  </div>
                </div>
              )}
              <p className="font-mono text-[9px] text-muted tracking-wider mt-3">
                Days 1 and 6 are not eligible for OT call-in. Middle 4 days are eligible.
                {otwpData.length > 0 && " OTWP counts show how many OT people were on each shift."}
              </p>
            </div>
          )}

          {/* YTD Tally — Needed + Worked */}
          {data.ytdNeeded && data.ytdNeeded.some((t) => t.total > 0) && (
            <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-150">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase mb-4">
                YTD OT Tally — {new Date().getFullYear()}
              </h2>

              {/* Shifts that needed OT */}
              <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-2">
                OT Call-Ins Needed (by on-shift platoon)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {data.ytdNeeded.map((t) => (
                  <div key={t.platoon} className="p-3 border border-border-subtle">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5" style={{ backgroundColor: `var(--platoon-${t.platoon})` }} />
                      <span className="font-mono text-[10px] tracking-wider uppercase">PLT-{t.platoon}</span>
                    </div>
                    <p className="font-display text-2xl font-bold" style={{ color: `var(--platoon-${t.platoon})` }}>{t.total}</p>
                    <p className="font-mono text-[9px] text-muted mt-1">needed on their shifts</p>
                  </div>
                ))}
              </div>

              {/* OT worked by each platoon */}
              <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-2">
                OT Shifts Worked (by off-duty platoon)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.ytdWorked.map((t) => (
                  <div key={t.platoon} className="p-3 border border-border-subtle">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5" style={{ backgroundColor: `var(--platoon-${t.platoon})` }} />
                      <span className="font-mono text-[10px] tracking-wider uppercase">PLT-{t.platoon}</span>
                    </div>
                    <p className="font-display text-2xl font-bold text-ember">{t.total}</p>
                    <p className="font-mono text-[9px] text-muted mt-1">OT shifts received</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rotation Overview */}
          <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-150">
            <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase mb-4">
              Rotation
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {data.allPlatoons.map((p) => (
                <div
                  key={p.platoon}
                  className={`p-3 border ${
                    p.isWorking ? "border-border bg-surface-raised" : "border-border-subtle"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2.5 h-2.5"
                      style={{ backgroundColor: `var(--${PLATOON_COLORS[p.platoon]})` }}
                    />
                    <span className="font-mono text-[10px] tracking-wider uppercase">
                      PLT-{p.platoon}
                    </span>
                  </div>
                  <p className={`font-mono text-xs ${
                    p.shift.type === "day"
                      ? "text-amber"
                      : p.shift.type === "night"
                        ? "text-platoon-3"
                        : "text-muted"
                  }`}>
                    {p.shift.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-6">
              <div className="font-mono text-[10px] tracking-wider text-muted">
                <span className="text-amber">DAY SHIFT:</span>{" "}
                {data.onShift.dayShift ? `PLT-${data.onShift.dayShift}` : "None"}
              </div>
              <div className="font-mono text-[10px] tracking-wider text-muted">
                <span className="text-platoon-3">NIGHT SHIFT:</span>{" "}
                {data.onShift.nightShift ? `PLT-${data.onShift.nightShift}` : "None"}
              </div>
            </div>
          </div>

          {/* Call-In List */}
          {data.callInData && (
            <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-300">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase mb-4">
                Call-In List — PLT-{data.userPlatoon}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <div>
                  <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-1">
                    Next Up
                  </p>
                  <p className="font-mono text-sm text-ember font-bold">
                    {data.callInData.currentUp}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-1">
                    Your Position
                  </p>
                  <p className="font-mono text-sm text-foreground">
                    {data.callInData.userPosition
                      ? `#${data.callInData.userPosition}`
                      : "Not found"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-1">
                    Positions Ahead
                  </p>
                  <p className={`font-mono text-sm ${
                    data.callInData.positionsAhead !== null && data.callInData.positionsAhead <= 15
                      ? "text-ember font-bold"
                      : "text-foreground"
                  }`}>
                    {data.callInData.positionsAhead !== null
                      ? data.callInData.positionsAhead
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mb-1">
                    Total on List
                  </p>
                  <p className="font-mono text-sm text-foreground">
                    {data.callInData.totalMembers}
                  </p>
                </div>
              </div>

              {/* Call-in list preview */}
              <div className="border border-border-subtle">
                <div className="px-3 py-2 bg-surface-raised border-b border-border-subtle flex items-center justify-between">
                  <span className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase">
                    Call-In Order
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.2em] text-ember uppercase">
                    {data.callInData.currentUp} is first up
                  </span>
                </div>
                <div className="divide-y divide-border-subtle">
                  {data.callInData.nearbyMembers.map((m) => {
                    const isUser =
                      data.callInData?.userPosition === m.position;
                    const isCurrentUp =
                      m.name.toUpperCase() ===
                      data.callInData?.currentUp.toUpperCase();
                    return (
                      <div
                        key={m.position}
                        className={`flex items-center justify-between px-3 py-2 ${
                          isUser
                            ? "bg-ember/10 border-l-2 border-l-ember"
                            : isCurrentUp
                              ? "bg-success/10 border-l-2 border-l-success"
                              : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-muted w-6">
                            {m.position}
                          </span>
                          <span
                            className={`font-mono text-xs ${
                              isUser
                                ? "text-ember font-bold"
                                : isCurrentUp
                                  ? "text-success font-bold"
                                  : "text-foreground"
                            }`}
                          >
                            {m.name}
                          </span>
                        </div>
                        {isUser && (
                          <span className="font-mono text-[9px] text-ember tracking-wider uppercase">
                            You
                          </span>
                        )}
                        {isCurrentUp && (
                          <span className="font-mono text-[9px] text-success tracking-wider uppercase">
                            Next Up
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {data.callInData.positionsAhead !== null && (
                <div className="mt-4 p-3 bg-surface-raised border border-border-subtle">
                  <p className="font-mono text-xs text-muted">
                    {data.callInData.positionsAhead <= 10 ? (
                      <span className="text-ember">
                        You are close to being called in. {data.callInData.positionsAhead} people ahead of you on the list.
                        {data.eligible && " You are eligible for overtime today."}
                      </span>
                    ) : data.callInData.positionsAhead <= 20 ? (
                      <span className="text-amber">
                        {data.callInData.positionsAhead} people ahead of you. Moderate chance of being called if high OT demand.
                      </span>
                    ) : (
                      <span>
                        {data.callInData.positionsAhead} people ahead of you. Unlikely to be called unless major event.
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="p-4 bg-surface-raised/50 border border-border-subtle animate-fade-slide-up delay-500">
            <p className="font-mono text-[10px] tracking-wider text-muted leading-relaxed">
              OT estimates are approximate. Actual call-ins depend on sick calls, trades, and staffing needs.
              Call-in list data from the shared Google Sheet — may be updated by duty officers.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="font-mono text-sm text-muted">
            Failed to load overtime data. Make sure your profile is set up.
          </p>
        </div>
      )}
    </div>
  );
}
