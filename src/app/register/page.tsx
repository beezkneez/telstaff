"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface MemberSuggestion {
  id: number;
  name: string;
  platoon: string;
  payrollNumber: string;
}
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    platoon: "1",
    homeStation: "1",
    payrollNumber: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MemberSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search members as user types name
  function handleNameChange(value: string) {
    update("name", value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/members/search?q=${encodeURIComponent(value.trim())}`);
      if (res.ok) {
        const data: MemberSuggestion[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    }, 250);
  }

  function selectMember(member: MemberSuggestion) {
    setForm((prev) => ({
      ...prev,
      name: member.name,
      platoon: member.platoon,
      payrollNumber: member.payrollNumber,
    }));
    setShowSuggestions(false);
    setSuggestions([]);
  }

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (nameRef.current && !nameRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Auto sign in after registration
      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-surface" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-ember/[0.04] rounded-full blur-[120px]" />

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8 animate-fade-slide-up">
            <Link href="/" className="inline-flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-ember/20 border border-ember/30 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-ember"
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
              <span className="font-display text-2xl font-bold tracking-wide">
                BETTER<span className="text-ember">STAFF</span>
              </span>
            </Link>
            <h1 className="font-display text-2xl font-bold tracking-wide">
              CREATE ACCOUNT
            </h1>
            <p className="text-sm text-muted mt-2">
              Set up your firefighter profile
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4 animate-fade-slide-up delay-150"
          >
            {error && (
              <div className="p-3 rounded-md bg-alert-red/10 border border-alert-red/20 text-alert-red text-sm">
                {error}
              </div>
            )}

            <div ref={nameRef} className="relative">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                required
                autoComplete="off"
                className="w-full px-4 py-3 rounded-md bg-surface border border-border text-foreground placeholder:text-muted/50 transition-colors focus:border-ember/50"
                placeholder="Start typing your name..."
              />
              {showSuggestions && (
                <ul className="absolute z-50 w-full mt-1 rounded-md bg-surface border border-border shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => selectMember(m)}
                        className="w-full text-left px-4 py-2.5 hover:bg-ember/10 transition-colors flex justify-between items-center"
                      >
                        <span className="text-foreground">{m.name}</span>
                        <span className="text-xs text-muted">PLT-{m.platoon}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Payroll Number
              </label>
              <input
                type="text"
                value={form.payrollNumber}
                onChange={(e) => update("payrollNumber", e.target.value)}
                required
                className="w-full px-4 py-3 rounded-md bg-surface border border-border text-foreground placeholder:text-muted/50 transition-colors focus:border-ember/50"
                placeholder="7-digit employee ID (e.g., 0862778)"
              />
              <p className="font-mono text-[10px] text-muted mt-1">
                Found on your Telestaff profile or pay stub
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
                className="w-full px-4 py-3 rounded-md bg-surface border border-border text-foreground placeholder:text-muted/50 transition-colors focus:border-ember/50"
                placeholder="you@email.com"
              />
              <p className="font-mono text-[10px] text-muted mt-1">
                Any email works — doesn&apos;t need to be your city email
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-md bg-surface border border-border text-foreground placeholder:text-muted/50 transition-colors focus:border-ember/50"
                placeholder="Min 8 characters"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Platoon
                </label>
                <select
                  value={form.platoon}
                  onChange={(e) => update("platoon", e.target.value)}
                  className="w-full px-4 py-3 rounded-md bg-surface border border-border text-foreground transition-colors focus:border-ember/50 appearance-none cursor-pointer"
                >
                  {["1", "2", "3", "4"].map((p) => (
                    <option key={p} value={p}>
                      Platoon {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Home Station
                </label>
                <select
                  value={form.homeStation}
                  onChange={(e) => update("homeStation", e.target.value)}
                  className="w-full px-4 py-3 rounded-md bg-surface border border-border text-foreground transition-colors focus:border-ember/50 appearance-none cursor-pointer"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>
                      Station {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-ember hover:bg-ember-glow disabled:bg-ember-dim text-white font-semibold rounded-md transition-all hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6 animate-fade-slide-up delay-300">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-ember hover:text-ember-glow transition-colors font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
