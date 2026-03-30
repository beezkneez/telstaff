"use client";

export default function OvertimePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-8 animate-fade-slide-up">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
          OVERTIME <span className="text-ember">INTEL</span>
        </h1>
        <p className="text-sm text-muted mt-1">
          Predict when you&apos;ll get called in
        </p>
      </div>

      {/* Placeholder */}
      <div className="animate-fade-slide-up delay-150">
        <div className="rounded-xl border border-border-subtle border-dashed bg-surface/50 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-ember/10 border border-ember/20 flex items-center justify-center mx-auto mb-5">
            <svg
              className="w-8 h-8 text-ember"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold tracking-wide mb-2">
            COMING SOON
          </h2>
          <p className="text-muted max-w-sm mx-auto text-sm leading-relaxed">
            The overtime prediction engine is being built. It will analyze
            staffing patterns, leave data, and seniority to estimate when
            you&apos;ll be called in for overtime.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-raised border border-border text-xs font-medium text-muted">
            <svg
              className="w-3.5 h-3.5 text-amber animate-pulse-ember"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                clipRule="evenodd"
              />
            </svg>
            In Development
          </div>
        </div>
      </div>
    </div>
  );
}
