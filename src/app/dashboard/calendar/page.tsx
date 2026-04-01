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

// Alberta stat holidays (simplified for client side)
function getStatHolidays(year: number): string[] {
  const getNth = (y: number, m: number, wd: number, n: number) => {
    let count = 0;
    for (let d = 1; d <= 31; d++) {
      const dt = new Date(y, m - 1, d);
      if (dt.getMonth() !== m - 1) break;
      if (dt.getDay() === wd) { count++; if (count === n) return dt.toISOString().split("T")[0]; }
    }
    return "";
  };
  const monBefore = (y: number, m: number, d: number) => {
    const t = new Date(y, m - 1, d);
    while (t.getDay() !== 1) t.setDate(t.getDate() - 1);
    return t.toISOString().split("T")[0];
  };
  const h = [
    `${year}-01-01`, getNth(year, 2, 1, 3), monBefore(year, 5, 25),
    `${year}-07-01`, getNth(year, 8, 1, 1), getNth(year, 9, 1, 1),
    `${year}-09-30`, getNth(year, 10, 1, 2), `${year}-11-11`, `${year}-12-25`,
  ];
  if (year === 2026) h.push("2026-04-03");
  if (year === 2027) h.push("2027-03-26");
  return h;
}

function isStatHoliday(dateStr: string): boolean {
  const year = parseInt(dateStr.split("-")[0]);
  return getStatHolidays(year).includes(dateStr);
}

// Payday: March 31, 2026 and every 2 weeks
const PAYDAY_ANCHOR = new Date("2026-03-31T12:00:00");

function isPayday(dateStr: string): boolean {
  const d = new Date(dateStr + "T12:00:00");
  const diff = Math.round((d.getTime() - PAYDAY_ANCHOR.getTime()) / (1000 * 60 * 60 * 24));
  return diff % 14 === 0;
}

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
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 border-2 border-black bg-surface" />
          <span className="font-mono text-[10px] text-muted">Stat</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-muted">✕ = Payday</span>
        </div>
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
        <div className="border-2 border-border animate-fade-slide-up delay-300">
          {/* Day headers */}
          <div className="grid grid-cols-7">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
              <div key={d} className="py-3 text-center font-display text-sm font-bold tracking-[0.25em] text-foreground bg-surface-raised border-b-2 border-border">
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((day, di) => {
                if (!day) {
                  return <div key={di} className="aspect-square bg-surface/20 border-r-2 border-b-2 border-background last:border-r-0" />;
                }

                const dateNum = parseInt(day.date.split("-")[2]);
                const isToday = day.date === today;
                const dayPlatoon = day.onShift?.dayShift;
                const nightPlatoon = day.onShift?.nightShift;
                const isStat = isStatHoliday(day.date);
                const payday = isPayday(day.date);

                return (
                  <div
                    key={di}
                    className={`aspect-square flex flex-col border-r-2 border-b-2 border-background last:border-r-0 overflow-hidden relative ${
                      isToday ? "ring-3 ring-ember ring-inset" : ""
                    }`}
                  >
                    {/* Stat holiday border */}
                    {isStat && (
                      <div className="absolute inset-[3px] border-[3px] border-black z-20 pointer-events-none" />
                    )}

                    {/* Payday X overlay */}
                    {payday && (
                      <div className="absolute inset-0 z-10 pointer-events-none">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <line x1="0" y1="0" x2="100" y2="100" stroke="black" strokeWidth="2.5" strokeOpacity="0.7" />
                          <line x1="100" y1="0" x2="0" y2="100" stroke="black" strokeWidth="2.5" strokeOpacity="0.7" />
                        </svg>
                      </div>
                    )}

                    {/* Day number */}
                    <div className={`absolute top-1 left-1.5 z-30 font-display text-base font-extrabold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${
                      isToday ? "text-white" : "text-white"
                    }`}>
                      {dateNum}
                    </div>

                    {/* Day shift — top half */}
                    <div
                      className="flex-1"
                      style={{
                        backgroundColor: dayPlatoon ? PLATOON_COLORS[dayPlatoon] : "var(--surface)",
                      }}
                    />

                    {/* Separator */}
                    <div className="h-[2px] bg-background" />

                    {/* Night shift — bottom half */}
                    <div
                      className="flex-1"
                      style={{
                        backgroundColor: nightPlatoon ? PLATOON_COLORS[nightPlatoon] : "var(--surface)",
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
