"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createMyAddress,
  deleteMyAddress,
  listMyAddresses,
  setDefaultMyAddress,
  updateMyAddress,
  type AddressItem,
  type CreateAddressPayload,
} from "@/lib/addresses-api";

type AddressFormState = CreateAddressPayload;

const initialFormState: AddressFormState = {
  full_name: "",
  phone: "",
  address_line: "",
  ward: "",
  city: "",
  country: "Vietnam",
  is_default: false,
};

type AddressManagerProps = {
  userId?: string;
};

export function AddressManager({ userId }: AddressManagerProps) {
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(initialFormState);

  const editingAddress = useMemo(
    () => addresses.find((item) => item.id === editingAddressId) ?? null,
    [addresses, editingAddressId],
  );

  async function reloadAddresses() {
    setLoading(true);
    setError(null);
    try {
      const list = await listMyAddresses(userId);
      setAddresses(list);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được danh sách địa chỉ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reloadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!editingAddress) {
      setForm(initialFormState);
      return;
    }
    setForm({
      full_name: editingAddress.full_name,
      phone: editingAddress.phone,
      address_line: editingAddress.address_line,
      ward: editingAddress.ward,
      city: editingAddress.city,
      country: editingAddress.country,
      is_default: editingAddress.is_default,
    });
  }, [editingAddress]);

  function updateForm<Key extends keyof AddressFormState>(key: Key, value: AddressFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setActionId(editingAddressId ?? "create");
    try {
      const payload: CreateAddressPayload = {
        ...form,
        district: form.ward.trim(),
      };
      if (editingAddressId) {
        await updateMyAddress(editingAddressId, payload);
        setSuccess("Đã cập nhật địa chỉ.");
      } else {
        await createMyAddress(payload);
        setSuccess("Đã tạo địa chỉ mới.");
      }
      setEditingAddressId(null);
      setForm(initialFormState);
      await reloadAddresses();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể lưu địa chỉ.");
    } finally {
      setActionId(null);
    }
  }

  async function handleDeleteAddress(id: string) {
    const confirmed = window.confirm("Bạn chắc chắn muốn xóa địa chỉ này?");
    if (!confirmed) {
      return;
    }
    setActionId(id);
    setError(null);
    setSuccess(null);
    try {
      await deleteMyAddress(id);
      setSuccess("Đã xóa địa chỉ.");
      if (editingAddressId === id) {
        setEditingAddressId(null);
        setForm(initialFormState);
      }
      await reloadAddresses();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xóa địa chỉ.");
    } finally {
      setActionId(null);
    }
  }

  async function handleSetDefaultAddress(id: string) {
    setActionId(id);
    setError(null);
    setSuccess(null);
    try {
      await setDefaultMyAddress(id);
      setSuccess("Đã đặt địa chỉ mặc định.");
      await reloadAddresses();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể đặt mặc định.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-semibold text-stone-900">Địa chỉ giao hàng</h2>
      <p className="mt-1 text-sm text-stone-600">Quản lý địa chỉ để checkout nhanh hơn.</p>

      {loading ? <p className="mt-4 text-sm text-stone-500">Đang tải địa chỉ...</p> : null}
      {error ? (
        <p className="mt-4 whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      {!loading ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {addresses.length === 0 ? (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                Bạn chưa có địa chỉ nào. Hãy tạo địa chỉ đầu tiên.
              </div>
            ) : (
              addresses.map((address) => (
                <article key={address.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                  <p className="font-semibold text-stone-900">
                    {address.full_name} ({address.phone}){" "}
                    {address.is_default ? (
                      <span className="rounded-full border border-stone-300 px-2 py-0.5 text-[10px] font-semibold">
                        Mặc định
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1">
                    {address.address_line}, {address.ward}, {address.city}, {address.country}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingAddressId(address.id)}
                      disabled={actionId !== null}
                      className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60"
                    >
                      Chỉnh sửa
                    </button>
                    {!address.is_default ? (
                      <button
                        type="button"
                        onClick={() => void handleSetDefaultAddress(address.id)}
                        disabled={actionId !== null}
                        className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60"
                      >
                        Đặt mặc định
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleDeleteAddress(address.id)}
                      disabled={actionId !== null}
                      className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                    >
                      Xóa
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="text-base font-semibold text-stone-900">
              {editingAddressId ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}
            </h3>
            <div className="mt-3 space-y-3">
              <input
                value={form.full_name}
                onChange={(event) => updateForm("full_name", event.target.value)}
                required
                placeholder="Họ và tên người nhận"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 outline-none focus:border-stone-800"
              />
              <input
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
                required
                placeholder="Số điện thoại"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 outline-none focus:border-stone-800"
              />
              <input
                value={form.address_line}
                onChange={(event) => updateForm("address_line", event.target.value)}
                required
                placeholder="Số nhà, tên đường"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 outline-none focus:border-stone-800"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.ward}
                  onChange={(event) => updateForm("ward", event.target.value)}
                  required
                  placeholder="Xã/Phường"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 outline-none focus:border-stone-800"
                />
                <input
                  value={form.city}
                  onChange={(event) => updateForm("city", event.target.value)}
                  required
                  placeholder="Tỉnh/Thành phố"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 outline-none focus:border-stone-800"
                />
                <input
                  value={form.country}
                  onChange={(event) => updateForm("country", event.target.value)}
                  required
                  placeholder="Quốc gia"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 outline-none focus:border-stone-800"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-stone-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_default)}
                  onChange={(event) => updateForm("is_default", event.target.checked)}
                  className="h-4 w-4 accent-stone-900"
                />
                Đặt làm địa chỉ mặc định
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={actionId !== null}
                className="rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
              >
                {editingAddressId ? "Cập nhật địa chỉ" : "Tạo địa chỉ"}
              </button>
              {editingAddressId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddressId(null);
                    setForm(initialFormState);
                  }}
                  disabled={actionId !== null}
                  className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60"
                >
                  Hủy
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
