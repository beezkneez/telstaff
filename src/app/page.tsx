import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Background gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-surface" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-ember/[0.03] rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-ember/[0.02] rounded-full blur-[100px]" />

      {/* Top bar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-ember/20 border border-ember/30 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-ember"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="font-display text-xl font-bold tracking-wide text-foreground">
            TELSTAFF<span className="text-ember">VIEWER</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 text-sm font-semibold bg-ember hover:bg-ember-glow text-white rounded-md transition-all hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-fade-slide-up max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raised border border-border text-xs font-medium text-muted mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-ember" />
            Edmonton Fire Rescue
          </div>

          <h1 className="font-display text-5xl sm:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6">
            YOUR STATION.
            <br />
            <span className="text-ember">YOUR CREW.</span>
            <br />
            <span className="text-muted">AT A GLANCE.</span>
          </h1>

          <p className="text-lg text-muted max-w-md mx-auto mb-10 leading-relaxed animate-fade-slide-up delay-150">
            Real-time staffing across all 31 stations and 4 platoons.
            Know who&apos;s on, what truck, and when overtime hits.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-slide-up delay-300">
            <Link
              href="/register"
              className="group flex items-center gap-2 px-8 py-3.5 bg-ember hover:bg-ember-glow text-white font-semibold rounded-md transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] w-full sm:w-auto justify-center"
            >
              Create Account
              <svg
                className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 border border-border hover:border-ember/40 text-foreground font-medium rounded-md transition-all hover:bg-surface-raised w-full sm:w-auto text-center"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full mt-20 animate-fade-slide-up delay-500">
          {[
            {
              icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
              title: "31 Stations",
              desc: "Every station, every truck",
            },
            {
              icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
              title: "4 Platoons",
              desc: "Switch between A, B, C, D",
            },
            {
              icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
              title: "Overtime Intel",
              desc: "Know when you&apos;re up next",
            },
          ].map((feat, i) => (
            <div
              key={feat.title}
              className="group p-5 rounded-lg bg-surface/60 border border-border-subtle hover:border-ember/20 transition-all hover:bg-surface-raised"
            >
              <svg
                className="w-6 h-6 text-ember mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={feat.icon}
                />
              </svg>
              <h3 className="font-display text-lg font-bold tracking-wide">
                {feat.title}
              </h3>
              <p className="text-sm text-muted mt-1">{feat.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-muted border-t border-border-subtle">
        TelStaff Viewer — Not affiliated with Kronos/UKG
      </footer>
    </div>
  );
}
