"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import { AddressManager } from "@/components/profile/AddressManager";

export default function ProfilePage() {
  const { user, isAuthenticated, loading, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setPhone(user.phone);
  }, [user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });
      setSuccess("Cập nhật hồ sơ thành công.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Cập nhật hồ sơ thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">Hồ sơ cá nhân</h1>
        <p className="mt-1 text-sm text-stone-600">Bạn chỉ được cập nhật thông tin tài khoản của chính mình.</p>

        {loading ? <p className="mt-4 text-sm text-stone-500">Đang tải thông tin...</p> : null}

        {!loading && !isAuthenticated ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Vui lòng đăng nhập để cập nhật hồ sơ.
            <div className="mt-3">
              <Link
                href="/"
                className="inline-flex rounded-full border border-amber-300 px-3 py-1.5 text-xs font-semibold hover:bg-amber-100"
              >
                Về trang chủ để đăng nhập
              </Link>
            </div>
          </div>
        ) : null}

        {!loading && isAuthenticated ? (
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <label className="block text-sm text-stone-700">
              <span className="mb-1 block font-medium">Tên</span>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Nhập tên"
                required
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-800"
              />
            </label>
            <label className="block text-sm text-stone-700">
              <span className="mb-1 block font-medium">Họ</span>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Nhập họ"
                required
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-800"
              />
            </label>
            <label className="block text-sm text-stone-700">
              <span className="mb-1 block font-medium">Số điện thoại</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Nhập số điện thoại"
                pattern="[0-9]{9,15}"
                required
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-800"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Đang cập nhật..." : "Lưu thay đổi"}
            </button>
          </form>
        ) : null}

        {error ? <p className="mt-3 whitespace-pre-line text-xs text-rose-600">{error}</p> : null}
        {success ? <p className="mt-3 text-xs text-emerald-600">{success}</p> : null}
      </section>

      {!loading && isAuthenticated ? (
        <div className="mx-auto mt-6 w-full max-w-5xl">
          <AddressManager userId={user?.id} />
        </div>
      ) : null}
    </div>
  );
}
