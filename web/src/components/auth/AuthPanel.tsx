"use client";

import { useState } from "react";

import { useAuth } from "./AuthProvider";

type AuthMode = "login" | "register";

type FormState = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  password: string;
};

const initialForm: FormState = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  password: "",
};

export function AuthPanel() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
        setSuccess("Đăng nhập thành công.");
      } else {
        await register(form);
        setSuccess("Tạo tài khoản và đăng nhập thành công.");
      }
      setForm(initialForm);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Xác thực thất bại. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-4 shadow-xl">
      <div className="mb-4 flex rounded-full border border-stone-200 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`w-1/2 rounded-full px-3 py-1.5 font-medium ${
            mode === "login" ? "bg-stone-900 text-white" : "text-stone-600"
          }`}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`w-1/2 rounded-full px-3 py-1.5 font-medium ${
            mode === "register" ? "bg-stone-900 text-white" : "text-stone-600"
          }`}
        >
          Đăng ký
        </button>
      </div>

      <form className="space-y-2.5" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <>
            <input
              value={form.first_name}
              onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
              placeholder="Tên"
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-800"
            />
            <input
              value={form.last_name}
              onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
              placeholder="Họ"
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-800"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Số điện thoại"
              pattern="[0-9]{9,15}"
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-800"
            />
          </>
        ) : null}

        <input
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          type="email"
          placeholder="Email"
          required
          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-800"
        />
        <input
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          type="password"
          minLength={8}
          placeholder="Mật khẩu"
          required
          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-800"
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </button>
      </form>

      {error ? <p className="mt-2 whitespace-pre-line text-xs text-rose-600">{error}</p> : null}
      {success ? <p className="mt-2 text-xs text-emerald-600">{success}</p> : null}
    </div>
  );
}
