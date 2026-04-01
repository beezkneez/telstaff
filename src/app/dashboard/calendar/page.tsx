"use client";

import { useState, useEffect } from "react";

interface DayShiftInfo {
  date: string;
  onShift: { dayShift: string | null; nightShift: string | null };
}

const PLATOON_COLORS: Record<string, string> = {
  "1": "var(--platoon-1)",
  "2": "var(--platoon-2)",
  "3": "var(--platoon-3)",
  "4": "var(--platoon-4)",
};

export default function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [days, setDays] = useState<DayShiftInfo[]>([]);
  const [userPlatoon, setUserPlatoon] = useState("");
  const [loading, setLoading] = useState(true);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => { if (d.profile) setUserPlatoon(d.profile.platoon); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const promises = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      promises.push(
        fetch(`/api/rotation?date=${dateStr}`)
          .then((r) => r.json())
          .then((data) => ({ date: dateStr, onShift: data.onShift || {} }))
      );
    }

    Promise.all(promises)
      .then((results) => setDays(results))
      .finally(() => setLoading(false));
  }, [year, month]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };
  const goToday = () => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth()); };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const weeks: (DayShiftInfo | null)[][] = [];
  let currentWeek: (DayShiftInfo | null)[] = [];

  for (let i = 0; i < firstDay; i++) currentWeek.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const dayData = days.find(
      (dd) => dd.date === `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    ) || null;
    currentWeek.push(dayData);
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
  }

  while (currentWeek.length > 0 && currentWeek.length < 7) currentWeek.push(null);
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6 animate-fade-slide-up">
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-[0.1em]">
          SHIFT<span className="text-ember">//</span>CALENDAR
        </h1>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4 animate-fade-slide-up delay-150">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-3 py-2 bg-surface border border-border font-mono text-xs hover:border-ember/40 transition-colors">←</button>
          <button onClick={goToday} className="px-3 py-2 bg-surface border border-border font-mono text-[10px] tracking-wider uppercase hover:border-ember/40 transition-colors">Today</button>
          <button onClick={nextMonth} className="px-3 py-2 bg-surface border border-border font-mono text-xs hover:border-ember/40 transition-colors">→</button>
        </div>
        <h2 className="font-display text-2xl font-bold tracking-[0.1em]">
          {monthNames[month].toUpperCase()} {year}
        </h2>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 animate-fade-slide-up delay-200">
        {["1", "2", "3", "4"].map((p) => (
          <div key={p} className="flex items-center gap-1.5">
            <span className="w-3 h-3" style={{ backgroundColor: PLATOON_COLORS[p] }} />
            <span className={`font-mono text-[11px] tracking-wider ${userPlatoon === p ? "text-foreground font-bold" : "text-muted"}`}>
              PLT-{p}{userPlatoon === p ? " (You)" : ""}
            </span>
          </div>
        ))}
        <span className="font-mono text-[10px] text-muted">Top = Day · Bottom = Night</span>
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-6 w-6 text-ember" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="border border-border animate-fade-slide-up delay-300">
          {/* Day headers */}
          <div className="grid grid-cols-7">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
              <div key={d} className="px-1 py-2 text-center font-mono text-[10px] tracking-[0.2em] text-muted bg-surface-raised/50 border-b border-border">
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((day, di) => {
                if (!day) {
                  return <div key={di} className="h-[72px] bg-surface/20 border-r border-b border-border-subtle last:border-r-0" />;
                }

                const dateNum = parseInt(day.date.split("-")[2]);
                const isToday = day.date === today;
                const dayPlatoon = day.onShift?.dayShift;
                const nightPlatoon = day.onShift?.nightShift;

                return (
                  <div
                    key={di}
                    className={`h-[72px] flex flex-col border-r border-b border-border-subtle last:border-r-0 overflow-hidden relative ${
                      isToday ? "ring-2 ring-ember ring-inset" : ""
                    }`}
                  >
                    {/* Day number */}
                    <div className={`absolute top-0.5 left-1 z-10 font-mono text-[11px] font-bold ${
                      isToday ? "text-ember" : "text-foreground/70"
                    }`}>
                      {dateNum}
                    </div>

                    {/* Day shift — top half */}
                    <div
                      className="flex-1"
                      style={{
                        backgroundColor: dayPlatoon
                          ? `color-mix(in srgb, ${PLATOON_COLORS[dayPlatoon]} 35%, var(--background))`
                          : "var(--surface)",
                      }}
                    />

                    {/* Night shift — bottom half */}
                    <div
                      className="flex-1"
                      style={{
                        backgroundColor: nightPlatoon
                          ? `color-mix(in srgb, ${PLATOON_COLORS[nightPlatoon]} 25%, var(--background))`
                          : "var(--surface)",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
