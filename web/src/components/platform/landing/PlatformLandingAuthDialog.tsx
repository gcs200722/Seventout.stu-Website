"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { LoginPayload, RegisterPayload } from "@/lib/auth-api";
import { usePlatformAuth } from "@/components/platform/core/auth/PlatformAuthProvider";

type AuthMode = "login" | "register";

export type PlatformLandingAuthDialogProps = {
  open: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
};

const phonePattern = /^[0-9]{9,15}$/;

export function PlatformLandingAuthDialog({
  open,
  initialMode = "login",
  onClose,
}: PlatformLandingAuthDialogProps) {
  const titleId = useId();
  const { login, register } = usePlatformAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState<LoginPayload>({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState<RegisterPayload>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
  });

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        await login(loginForm);
        onClose();
        setLoginForm({ email: "", password: "" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign in failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [login, loginForm, onClose],
  );

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!phonePattern.test(registerForm.phone.trim())) {
        setError("Phone must be 9–15 digits.");
        return;
      }
      setSubmitting(true);
      try {
        await register(registerForm);
        onClose();
        setRegisterForm({
          first_name: "",
          last_name: "",
          email: "",
          password: "",
          phone: "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [register, registerForm, onClose],
  );

  if (!open) {
    return null;
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-800/20 placeholder:text-zinc-400 focus:border-emerald-800 focus:ring-2";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-[#F9F8F6] p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
            {mode === "login" ? "Log in to LUMIERE" : "Create your account"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-200/80 hover:text-zinc-800"
            aria-label="Close"
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        {error ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                value={loginForm.email}
                onChange={(ev) => setLoginForm((f) => ({ ...f, email: ev.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                minLength={8}
                className={inputClass}
                value={loginForm.password}
                onChange={(ev) => setLoginForm((f) => ({ ...f, password: ev.target.value }))}
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-full bg-emerald-800 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-900 disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Log in"}
            </button>
            <p className="text-center text-sm text-zinc-600">
              No account?{" "}
              <button
                type="button"
                className="font-medium text-emerald-800 hover:underline"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
              >
                Register
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-zinc-700">
                First name
                <input
                  type="text"
                  required
                  autoComplete="given-name"
                  className={inputClass}
                  value={registerForm.first_name}
                  onChange={(ev) =>
                    setRegisterForm((f) => ({ ...f, first_name: ev.target.value }))
                  }
                />
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                Last name
                <input
                  type="text"
                  required
                  autoComplete="family-name"
                  className={inputClass}
                  value={registerForm.last_name}
                  onChange={(ev) =>
                    setRegisterForm((f) => ({ ...f, last_name: ev.target.value }))
                  }
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-zinc-700">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                value={registerForm.email}
                onChange={(ev) => setRegisterForm((f) => ({ ...f, email: ev.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Phone
              <input
                type="tel"
                required
                autoComplete="tel"
                inputMode="numeric"
                pattern="[0-9]{9,15}"
                title="9–15 digits"
                className={inputClass}
                value={registerForm.phone}
                onChange={(ev) =>
                  setRegisterForm((f) => ({ ...f, phone: ev.target.value.replace(/\D/g, "") }))
                }
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Password
              <input
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                className={inputClass}
                value={registerForm.password}
                onChange={(ev) =>
                  setRegisterForm((f) => ({ ...f, password: ev.target.value }))
                }
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-full bg-emerald-800 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-900 disabled:opacity-60"
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>
            <p className="text-center text-sm text-zinc-600">
              Already have an account?{" "}
              <button
                type="button"
                className="font-medium text-emerald-800 hover:underline"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                Log in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
