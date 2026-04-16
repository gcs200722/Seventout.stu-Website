"use client";

import { useEffect, useState } from "react";

import {
  type AdminUser,
  deleteAdminUser,
  getAdminUserById,
  getAdminUsers,
  type PermissionCode,
  type UserRole,
  updateAdminUser,
  updateAdminUserRole,
} from "@/lib/admin-api";

const PAGE_LIMIT = 10;
const ROLE_OPTIONS: UserRole[] = ["ADMIN", "STAFF", "USER"];
const PERMISSION_OPTIONS: PermissionCode[] = [
  "PRODUCT_MANAGE",
  "ORDER_MANAGE",
  "USER_READ",
  "CATEGORY_READ",
  "CATEGORY_MANAGE",
  "INVENTORY_READ",
  "INVENTORY_MANAGE",
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("USER");
  const [permissions, setPermissions] = useState<PermissionCode[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAdminUsers({ page, limit: PAGE_LIMIT });
        setUsers(data);
        setHasNextPage(data.length === PAGE_LIMIT);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Không tải được danh sách người dùng.");
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, [page]);

  function syncForm(user: AdminUser) {
    setSelectedUser(user);
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setPhone(user.phone);
    setRole(user.role);
    setPermissions(user.permissions ?? []);
  }

  async function handleSelectUser(userId: string) {
    try {
      setDetailLoading(true);
      setDetailError(null);
      const user = await getAdminUserById(userId);
      syncForm(user);
    } catch (requestError) {
      setDetailError(requestError instanceof Error ? requestError.message : "Không tải được chi tiết người dùng.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function reloadCurrentPage() {
    const data = await getAdminUsers({ page, limit: PAGE_LIMIT });
    setUsers(data);
    setHasNextPage(data.length === PAGE_LIMIT);
  }

  async function handleUpdateProfile() {
    if (!selectedUser) {
      return;
    }

    try {
      setActionLoading(true);
      setSuccessMessage(null);
      await updateAdminUser(selectedUser.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });
      const freshUser = await getAdminUserById(selectedUser.id);
      syncForm(freshUser);
      await reloadCurrentPage();
      setSuccessMessage("Đã cập nhật thông tin người dùng.");
    } catch (requestError) {
      setDetailError(requestError instanceof Error ? requestError.message : "Không thể cập nhật hồ sơ.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateRole() {
    if (!selectedUser) {
      return;
    }

    try {
      setActionLoading(true);
      setDetailError(null);
      setSuccessMessage(null);
      await updateAdminUserRole(selectedUser.id, {
        role,
        permissions: role === "STAFF" ? permissions : [],
      });
      const freshUser = await getAdminUserById(selectedUser.id);
      syncForm(freshUser);
      await reloadCurrentPage();
      setSuccessMessage("Đã cập nhật vai trò người dùng.");
    } catch (requestError) {
      setDetailError(requestError instanceof Error ? requestError.message : "Không thể cập nhật vai trò.");
    } finally {
      setActionLoading(false);
    }
  }

  function handleTogglePermission(permissionCode: PermissionCode) {
    setPermissions((previousPermissions) => {
      if (previousPermissions.includes(permissionCode)) {
        return previousPermissions.filter((item) => item !== permissionCode);
      }
      return [...previousPermissions, permissionCode];
    });
  }

  async function handleDeleteUser(userId: string) {
    const confirmed = window.confirm("Bạn chắc chắn muốn xóa người dùng này?");
    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);
      setSuccessMessage(null);
      await deleteAdminUser(userId);
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
        setDetailError(null);
      }

      if (users.length === 1 && page > 1) {
        setPage((previousPage) => previousPage - 1);
      } else {
        await reloadCurrentPage();
      }
      setSuccessMessage("Đã xóa người dùng.");
    } catch (requestError) {
      setDetailError(requestError instanceof Error ? requestError.message : "Không thể xóa người dùng.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Quản lý người dùng</h1>
        <p className="mt-1 text-sm text-stone-600">
          Danh sách dùng `GET /users?page=&limit=`; chi tiết, cập nhật hồ sơ, đổi role và xóa người dùng tuân thủ users
          endpoint spec.
        </p>
      </header>

      {loading ? <p className="text-sm text-stone-500">Đang tải dữ liệu...</p> : null}

      {error ? (
        <div className="whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200 text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-600">
                  <tr>
                    <th className="px-4 py-3">Họ tên</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Số điện thoại</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-right">Hành động</th>
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
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-stone-300 px-3 py-1.5 text-xs hover:bg-stone-100"
                            onClick={() => {
                              void handleSelectUser(user.id);
                            }}
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-rose-300 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
                            onClick={() => {
                              void handleDeleteUser(user.id);
                            }}
                            disabled={actionLoading}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-stone-500">
                        Chưa có dữ liệu người dùng.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-stone-200 pt-4">
              <p className="text-xs text-stone-500">
                Trang {page} - Giới hạn {PAGE_LIMIT} bản ghi/trang
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-stone-300 px-3 py-1.5 text-xs hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    setPage((previousPage) => Math.max(1, previousPage - 1));
                  }}
                  disabled={page === 1 || loading}
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  className="rounded-md border border-stone-300 px-3 py-1.5 text-xs hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    setPage((previousPage) => previousPage + 1);
                  }}
                  disabled={!hasNextPage || loading}
                >
                  Trang sau
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <h2 className="text-base font-semibold text-stone-900">Cập nhật hồ sơ / Role</h2>
            {detailLoading ? <p className="text-sm text-stone-500">Đang tải chi tiết...</p> : null}
            {detailError ? <p className="whitespace-pre-line text-sm text-rose-700">{detailError}</p> : null}
            {!selectedUser ? (
              <p className="text-sm text-stone-500">Chọn một người dùng trong danh sách để thao tác.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-stone-500">
                  User ID: <span className="font-mono">{selectedUser.id}</span>
                </p>
                <p className="text-xs text-stone-500">Email: {selectedUser.email}</p>
                <label className="block text-sm">
                  <span className="mb-1 block text-stone-600">First name</span>
                  <input
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
                    value={firstName}
                    onChange={(event) => {
                      setFirstName(event.target.value);
                    }}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-stone-600">Last name</span>
                  <input
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
                    value={lastName}
                    onChange={(event) => {
                      setLastName(event.target.value);
                    }}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-stone-600">Phone</span>
                  <input
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => {
                    void handleUpdateProfile();
                  }}
                  disabled={actionLoading}
                >
                  Cập nhật profile
                </button>
                <label className="block text-sm">
                  <span className="mb-1 block text-stone-600">Role</span>
                  <select
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
                    value={role}
                    onChange={(event) => {
                      setRole(event.target.value as UserRole);
                    }}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                {role === "STAFF" ? (
                  <div className="space-y-2 rounded-md border border-stone-200 bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Permissions (STAFF)</p>
                    {PERMISSION_OPTIONS.map((permissionOption) => (
                      <label key={permissionOption} className="flex items-center gap-2 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={permissions.includes(permissionOption)}
                          onChange={() => {
                            handleTogglePermission(permissionOption);
                          }}
                        />
                        <span>{permissionOption}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => {
                    void handleUpdateRole();
                  }}
                  disabled={actionLoading}
                >
                  Cập nhật role (ADMIN)
                </button>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
