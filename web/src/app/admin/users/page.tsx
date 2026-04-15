"use client";

import { useEffect, useState } from "react";

import { type AdminUser, getAdminUsers } from "@/lib/admin-api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await getAdminUsers();
        setUsers(data);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Không tải được danh sách người dùng.");
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, []);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Quản lý người dùng</h1>
        <p className="mt-1 text-sm text-stone-600">Dữ liệu lấy từ endpoint `GET /users`.</p>
      </header>

      {loading ? <p className="text-sm text-stone-500">Đang tải dữ liệu...</p> : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-600">
              <tr>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Số điện thoại</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium text-stone-900">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{user.email}</td>
                  <td className="px-4 py-3 text-stone-700">{user.phone}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                      {user.role}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-stone-500">
                    Chưa có dữ liệu người dùng.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
