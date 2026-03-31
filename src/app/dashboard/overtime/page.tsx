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

          {/* Last 6-Off Period */}
          {data.sixOffDetails && data.sixOffDetails.length > 0 && (
            <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-400">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase mb-4">
                Last 6-Off — OT Shifts
              </h2>
              <div className="space-y-1">
                {data.sixOffDetails.map((day, i) => {
                  const dateObj = new Date(day.date + "T12:00:00");
                  const dayLabel = dateObj.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  const isToday = day.date === selectedDate;

                  return (
                    <div
                      key={day.date}
                      className={`flex items-center justify-between px-3 py-2.5 ${
                        isToday
                          ? "bg-ember/10 border-l-2 border-l-ember"
                          : day.eligible
                            ? "bg-surface-raised/50"
                            : "opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-muted w-4">
                          {i + 1}
                        </span>
                        <span className={`font-mono text-xs ${isToday ? "text-ember font-bold" : "text-foreground"}`}>
                          {dayLabel}
                        </span>
                        {!day.eligible && (
                          <span className="font-mono text-[9px] text-muted tracking-wider">
                            NOT ELIGIBLE
                          </span>
                        )}
                        {isToday && (
                          <span className="font-mono text-[9px] text-ember tracking-wider uppercase">
                            Today
                          </span>
                        )}
                      </div>
                      {day.eligible && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] text-amber tracking-wider">DAY</span>
                            <span
                              className="font-mono text-[10px] px-1.5 py-0.5"
                              style={{
                                backgroundColor: day.dayShiftPlatoon
                                  ? `color-mix(in srgb, var(--platoon-${day.dayShiftPlatoon}) 15%, transparent)`
                                  : undefined,
                                color: day.dayShiftPlatoon
                                  ? `var(--platoon-${day.dayShiftPlatoon})`
                                  : undefined,
                              }}
                            >
                              PLT-{day.dayShiftPlatoon}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] text-platoon-3 tracking-wider">NIGHT</span>
                            <span
                              className="font-mono text-[10px] px-1.5 py-0.5"
                              style={{
                                backgroundColor: day.nightShiftPlatoon
                                  ? `color-mix(in srgb, var(--platoon-${day.nightShiftPlatoon}) 15%, transparent)`
                                  : undefined,
                                color: day.nightShiftPlatoon
                                  ? `var(--platoon-${day.nightShiftPlatoon})`
                                  : undefined,
                              }}
                            >
                              PLT-{day.nightShiftPlatoon}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="font-mono text-[9px] text-muted tracking-wider mt-3">
                Days 1 and 6 are not eligible for OT call-in. Middle 4 days are eligible.
              </p>
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
